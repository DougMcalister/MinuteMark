from django.contrib import admin
from .models import Membership, Project, TimeEntry, Workspace
admin.site.register(Workspace)
admin.site.register(Membership)
admin.site.register(Project)
admin.site.register(TimeEntry)
