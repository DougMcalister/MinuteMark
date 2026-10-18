from datetime import timedelta
from typing import cast
from django.db.models import Sum, F, DurationField, ExpressionWrapper
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Membership, Project, TimeEntry, Workspace
from .serializers import ProjectSerializer, RegisterSerializer, TimeEntrySerializer, UserSerializer, WorkspaceSerializer
from django.contrib.auth.models import User
from rest_framework.exceptions import PermissionDenied
from rest_framework.request import Request

class HealthView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    def get(self, request): return Response({"status": "ok"})

class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if response.data is not None:
            user = self.get_queryset().get(
                pk=response.data["id"]
            )
            token, _ = Token.objects.get_or_create(user=user)
            return Response(
                {
                    "token": token.key,
                    "user": UserSerializer(user).data
                },
                status=status.HTTP_201_CREATED
            )
        else: raise RuntimeError("Response expected but none received")
    
    def get_queryset(self): #type: ignore
        return User.objects.all()

class LoginView(ObtainAuthToken):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(
            data=request.data,
            context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        if serializer.validated_data is not None:
            user = serializer.validated_data["user"] #type: ignore
            token, _ = Token.objects.get_or_create(user=user)
            return Response(
                {
                    "token": token.key,
                    "user": UserSerializer(user).data
                }
            )
        else: 
            raise RuntimeError("Data returned None")

class OwnedViewSet(viewsets.ModelViewSet):
    def workspace(self):
        workspace_id = self.request.headers.get("X-Workspace-ID")
        memberships = Membership.objects.filter(
            user=self.request.user
        ).select_related("workspace")
        membership = memberships.filter(
            workspace_id=workspace_id
        ).first() if workspace_id else memberships.first()

        if not membership:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You are not a member of this workspace.")
        return membership.workspace
    
    def get_serializer_context(self):
        context = super().get_serializer_context() 
        context["workspace"] = self.workspace()
        return context
    
    def perform_create(self, serializer): 
        serializer.save(
            owner=self.request.user,
            workspace=self.workspace()
        )

class WorkspaceViewSet(viewsets.ModelViewSet):
    serializer_class = WorkspaceSerializer

    def get_queryset(self): #type: ignore
        return Workspace.objects.filter(
            memberships__user = self.request.user
        ).prefetch_related("memberships__user")
    
    def perform_create(self, serializer):
        workspace = serializer.save(owner=self.request.user)
        Membership.objects.create(
            workspace=workspace,
            user=self.request.user,
            role=Membership.Role.OWNER
        )

    @action(detail=True, methods=["post"])

    def invite(self, request, pk=None):
        workspace = self.get_object()
        actor = Membership.objects.get(
            workspace=workspace,
            user=request.user
        )
        if actor.role not in [
            Membership.Role.OWNER,
            Membership.Role.ADMIN
        ]:
            return Response({
                "detail": "Only owners and admins can add members."
            }, 
            status=403
        )

        user = User.objects.filter(
            email__iexact=request.data.get("email", "")
        ).first()
        if not user: 
            return Response({
                "detail": "Ask this person to create an account first."
                },
                status=404
            )
        _, created = (
            Membership.objects
            .get_or_create(
                workspace=workspace,
                user=user
            )
        )
        return Response(
            WorkspaceSerializer(workspace).data,
            status=201 if created else 200
        )

class ProjectViewSet(OwnedViewSet):
    serializer_class = ProjectSerializer

    def get_queryset(self): #type: ignore
        return Project.objects.filter(
            workspace=self.workspace()
        )

class TimeEntryViewSet(OwnedViewSet):
    serializer_class = TimeEntrySerializer

    def get_queryset(self): #type: ignore
        request = cast(Request, self.request)

        qs = TimeEntry.objects.filter(
            workspace=self.workspace()
        ).select_related("project", "owner")
        start, end = (
            request.query_params.get("start"), 
            request.query_params.get("end")
        )
        if start: 
            qs = qs.filter(start__gte=start)
        if end: 
            qs = qs.filter(start__lt=end)
        return qs
    
    def perform_create(self, serializer):
        if serializer.validated_data.get("stop") is None:
            TimeEntry.objects.filter(
                owner=self.request.user, 
                workspace=self.workspace(),
                stop__isnull = True
            ).update(stop=timezone.now())
            
        serializer.save(
            owner=self.request.user,
            workspace=self.workspace()
        )

    def ensure_entry_owner(self, entry):
        if entry.owner != self.request.user:
            raise PermissionDenied(
                "Only the person who tracked this entry can change it."
            )
        
    def perform_update(self, serializer):
        self.ensure_entry_owner(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self.ensure_entry_owner(instance)
        instance.delete()

    @action(detail=False, methods=["get"])

    def running(self, request):
        entry = self.get_queryset().filter(stop__isnull=True).first()
        return Response(
            self.get_serializer(entry).data if entry else None
        )
    
    @action(detail=True, methods=["post"])

    def stop(self, request, pk=None):
        entry = self.get_object()
        self.ensure_entry_owner(entry)
        if entry.stop: return Response({
            "detail": "Entry is already stopped."
            },
            status=400
        )
        entry.stop = timezone.now()
        entry.save(update_fields=["stop"])
        return Response(self.get_serializer(entry).data)

    def manual_entry(self):
        entry = self.get_object()
        
    
    @action(detail=False, methods=["get"])

    def summary(self, request):
        today = timezone.localdate()
        week_start = today - timedelta(
            days=today.weekday()
        )
        qs = (
            self.get_queryset()
            .filter(
                start__date__gte=week_start,
                stop__isnull=False
            )
        )
        duration = ExpressionWrapper(
            F("stop") - F("start"),
            output_field=DurationField()
        )
        grouped = (
            qs.values(
                "start__date",
                "project__name",
                "project__color"
            )
            .annotate(total=Sum(duration))
            .order_by("start__date")
        )
        return Response(
            [{
                "date": row["start__date"],
                "project": row["project__name"] 
                or "No project",
                "color": row["project__color"] or 
                "#94a3b8", 
                "seconds": int(
                    row["total"]
                    .total_seconds()
                )
            } for row in grouped]
        )
