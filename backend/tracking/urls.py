from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import LoginView, ProjectViewSet, RegisterView, TimeEntryViewSet, WorkspaceViewSet
router = DefaultRouter()

router.register("workspaces", WorkspaceViewSet, basename="workspace")
router.register("projects", ProjectViewSet, basename="project")
router.register("entries", TimeEntryViewSet, basename="entry")

urlpatterns = [
    path("auth/register/", RegisterView.as_view()), 
    path("auth/login/", LoginView.as_view()),
    path("", include(router.urls))
]
