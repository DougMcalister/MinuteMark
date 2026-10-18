from datetime import timedelta
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase
from .models import Membership, Project, TimeEntry, Workspace

class TrackingApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("ada", password="safe-password")
        token = Token.objects.create(user=self.user)
        self.workspace = Workspace.objects.create(owner=self.user, name="Product team")
        Membership.objects.create(workspace=self.workspace, user=self.user, role="owner")
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}", HTTP_X_WORKSPACE_ID=str(self.workspace.id))
        self.project = Project.objects.create(owner=self.user, workspace=self.workspace, name="Launch", color="#7c3aed")
    def test_starting_timer_stops_existing_timer(self):
        old = TimeEntry.objects.create(owner=self.user, workspace=self.workspace, start=timezone.now() - timedelta(hours=1))
        response = self.client.post("/api/entries/", {"description": "New task", "project": self.project.id, "start": timezone.now().isoformat()}, format="json")
        self.assertEqual(response.status_code, 201)
        old.refresh_from_db(); self.assertIsNotNone(old.stop)
    def test_user_cannot_use_another_users_project(self):
        other = User.objects.create_user("grace")
        other_workspace = Workspace.objects.create(owner=other, name="Other")
        Membership.objects.create(workspace=other_workspace, user=other, role="owner")
        project = Project.objects.create(owner=other, workspace=other_workspace, name="Secret")
        response = self.client.post("/api/entries/", {"project": project.id, "start": timezone.now().isoformat()}, format="json")
        self.assertEqual(response.status_code, 400)
    def test_stopping_timer_calculates_positive_duration(self):
        entry = TimeEntry.objects.create(owner=self.user, workspace=self.workspace, start=timezone.now() - timedelta(minutes=5))
        response = self.client.post(f"/api/entries/{entry.id}/stop/")
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data["duration_seconds"], 299)
    def test_non_member_cannot_read_workspace_entries(self):
        outsider = User.objects.create_user("linus")
        token = Token.objects.create(user=outsider)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}", HTTP_X_WORKSPACE_ID=str(self.workspace.id))
        self.assertEqual(self.client.get("/api/entries/").status_code, 403)

class RegistrationTests(APITestCase):
    def test_registration_returns_token_and_creates_private_workspace(self):
        response = self.client.post("/api/auth/register/", {
            "username": "new-user", "email": "new@example.com", "password": "safe-password"
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertIn("token", response.data)
        user = User.objects.get(username="new-user")
        membership = Membership.objects.get(user=user)
        self.assertEqual(membership.role, Membership.Role.OWNER)

    def test_cors_preflight_allows_workspace_header(self):
        response = self.client.options(
            "/api/workspaces/",
            HTTP_ORIGIN="http://127.0.0.1:3000",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="GET",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="authorization,x-workspace-id",
        )
        self.assertEqual(response.status_code, 200)
        allowed = response["access-control-allow-headers"].lower()
        self.assertIn("x-workspace-id", allowed)
