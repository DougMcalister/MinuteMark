from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import serializers
from .models import Membership, Project, TimeEntry, Workspace

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    class Meta:
        model = User
        fields = ["id", "username", "email", "password"]
        read_only_fields = ["id"]
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        workspace = Workspace.objects.create(owner=user, name=f"{user.username}'s team")
        Membership.objects.create(workspace=workspace, user=user, role=Membership.Role.OWNER)
        return user

class MembershipSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    class Meta:
        model = Membership
        fields = ["id", "user", "username", "email", "role", "joined_at"]
        read_only_fields = ["user", "joined_at"]

class WorkspaceSerializer(serializers.ModelSerializer):
    memberships = MembershipSerializer(many=True, read_only=True)
    class Meta:
        model = Workspace
        fields = ["id", "name", "memberships", "created_at"]
        read_only_fields = ["created_at", "memberships"]

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["id", "name", "color", "archived", "created_at"]
        read_only_fields = ["created_at"]

class TimeEntrySerializer(serializers.ModelSerializer):
    duration_seconds = serializers.IntegerField(read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    project_color = serializers.CharField(source="project.color", read_only=True)
    owner_name = serializers.CharField(source="owner.username", read_only=True)
    class Meta:
        model = TimeEntry
        fields = ["id", "description", "project", "project_name", "project_color", "owner_name", "start", "stop", "billable", "duration_seconds", "created_at"]
        read_only_fields = ["created_at", "duration_seconds"]
    def validate_project(self, value):
        if value and value.workspace != self.context.get("workspace"):
            raise serializers.ValidationError("Project does not belong to this workspace.")
        return value
    def validate(self, attrs):
        start = attrs.get("start", getattr(self.instance, "start", None))
        stop = attrs.get("stop", getattr(self.instance, "stop", None))
        if start and stop and stop <= start:
            raise serializers.ValidationError({"stop": "Stop must be after start."})
        return attrs
