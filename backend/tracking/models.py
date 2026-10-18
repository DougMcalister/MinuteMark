from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

class OwnedModel(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True

class Workspace(OwnedModel):
    name = models.CharField(max_length=120)
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="Membership",
        related_name="workspaces"
    )
    def __str__(self):
        return self.name

class Membership(models.Model):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        ADMIN = "admin", "Admin"
        MEMBER = "member", "Member"

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="memberships"
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="memberships"
    )
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.MEMBER
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "user"],
                name="unique_workspace_member"
            )
        ]

class Project(OwnedModel):
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="projects"
    )
    name = models.CharField(max_length=120)
    color = models.CharField(max_length=7, default="#7c3aed")
    archived = models.BooleanField(default=False)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "name"],
                name="unique_project_name_per_workspace"
            )
        ]

    def __str__(self):
        return self.name

class TimeEntry(OwnedModel):
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="entries"
    )
    description = models.CharField(max_length=255, blank=True)
    project = models.ForeignKey(
        Project,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="entries"
    )
    start = models.DateTimeField()
    stop = models.DateTimeField(null=True, blank=True)
    billable = models.BooleanField(default=False)

    class Meta:
        ordering = ["-start"]
        indexes = [models.Index(
            fields=["owner", "start"],
            name="tracking_t_owner_i_767e35_idx"
        )]

    def clean(self):
        if self.stop and self.stop <= self.start:
            raise ValidationError({
                "stop": "Stop must be after start."
            })
        if self.project_id and self.project.workspace_id != self.workspace_id:
            raise ValidationError({
                "project": "Project must belong to the same workspace."
            })
    @property
    def duration_seconds(self):
        return max(0, int(((self.stop or timezone.now()) - self.start).total_seconds()))
