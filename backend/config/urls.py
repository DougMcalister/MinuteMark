from django.contrib import admin
from django.urls import include, path
from tracking.views import HealthView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", HealthView.as_view()),
    path("api/", include("tracking.urls")),
]

