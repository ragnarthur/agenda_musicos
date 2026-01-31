from calendar import month_name
from datetime import datetime, timedelta

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from .models import City, Event, Musician, MusicianRequest
from .serializers import (
    CityCreateSerializer,
    CitySerializer,
    EventListSerializer,
    MusicianRequestAdminSerializer,
    MusicianRequestSerializer,
)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def dashboard_stats(request):
    """Get dashboard statistics for admin panel"""
    try:
        now = timezone.now()
        current_month_start = now.replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )

        # Request counts
        total_requests = MusicianRequest.objects.count()
        pending_requests = MusicianRequest.objects.filter(status="pending").count()
        approved_requests = MusicianRequest.objects.filter(status="approved").count()
        rejected_requests = MusicianRequest.objects.filter(status="rejected").count()

        return Response(
            {
                "total_requests": total_requests,
                "pending_requests": pending_requests,
                "approved_requests": approved_requests,
                "rejected_requests": rejected_requests,
            }
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def booking_requests_list(request):
    """Get all booking requests with filtering"""
    try:
        requests = MusicianRequest.objects.all().order_by("-created_at")
        serializer = MusicianRequestSerializer(requests, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def booking_request_detail(request, pk):
    """Get specific booking request details"""
    try:
        request_obj = MusicianRequest.objects.get(pk=pk)
        serializer = MusicianRequestSerializer(request_obj)
        return Response(serializer.data)
    except MusicianRequest.DoesNotExist:
        return Response(
            {"error": "Request not found"}, status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminUser])
def approve_booking_request(request, pk):
    """Approve a booking request"""
    try:
        request_obj = MusicianRequest.objects.get(pk=pk)

        if request_obj.status != "pending":
            return Response(
                {"error": "Request can only be approved if status is pending"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request_obj.status = "approved"
        request_obj.reviewed_by = request.user
        request_obj.reviewed_at = timezone.now()
        request_obj.save()

        # Email is sent via email_service.send_approval_notification in views.py
        return Response({"message": "Request approved successfully"})
    except MusicianRequest.DoesNotExist:
        return Response(
            {"error": "Request not found"}, status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminUser])
def reject_booking_request(request, pk):
    """Reject a booking request"""
    try:
        request_obj = MusicianRequest.objects.get(pk=pk)
        rejection_reason = request.data.get("rejection_reason", "")

        if request_obj.status != "pending":
            return Response(
                {"error": "Request can only be rejected if status is pending"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request_obj.status = "rejected"
        request_obj.admin_notes = rejection_reason  # Store reason in admin_notes
        request_obj.reviewed_by = request.user
        request_obj.reviewed_at = timezone.now()
        request_obj.save()

        # Email is sent via email_service.send_rejection_notification in views.py
        return Response({"message": "Request rejected successfully"})
    except MusicianRequest.DoesNotExist:
        return Response(
            {"error": "Request not found"}, status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_events_list(request):
    """Get all events for admin management"""
    try:
        events = Event.objects.all().order_by("-date")
        serializer = EventListSerializer(events, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([])  # Public endpoint
def public_request_status(request):
    """Public endpoint to check request status by email or request ID"""
    try:
        email = request.GET.get("email")
        request_id = request.GET.get("request_id")

        if not email and not request_id:
            return Response(
                {"error": "Email or request ID is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if email:
            # Search by email, return the most recent request
            requests = MusicianRequest.objects.filter(email__iexact=email).order_by(
                "-created_at"
            )
            if not requests.exists():
                return Response([], status=status.HTTP_200_OK)

            # Return only the most recent request
            serializer = MusicianRequestSerializer(requests.first())
            return Response(serializer.data)

        elif request_id:
            # Search by request ID
            try:
                request_obj = MusicianRequest.objects.get(id=request_id)
                serializer = MusicianRequestSerializer(request_obj)
                return Response(serializer.data)
            except MusicianRequest.DoesNotExist:
                return Response(
                    {"error": "Request not found"}, status=status.HTTP_404_NOT_FOUND
                )

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_reports(request):
    """Get detailed reports for admin dashboard"""
    try:
        now = timezone.now()

        # Monthly data for the last 12 months
        monthly_data = []
        for i in range(12):
            month_start = (now - timedelta(days=i * 30)).replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            )
            month_end = (month_start + timedelta(days=32)).replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            ) - timedelta(seconds=1)

            month_requests = MusicianRequest.objects.filter(
                created_at__gte=month_start, created_at__lte=month_end
            )

            monthly_data.append(
                {
                    "month": month_name[month_start.month],
                    "year": month_start.year,
                    "requests": month_requests.count(),
                    "approved": month_requests.filter(status="approved").count(),
                }
            )

        # Instrument distribution
        instrument_distribution = (
            MusicianRequest.objects.values("instrument")
            .annotate(
                count=Count("id"),
                approved_count=Count("id", filter=Q(status="approved")),
            )
            .order_by("-count")
        )

        # Recent activity
        recent_requests = MusicianRequest.objects.all().order_by("-created_at")[:10]
        recent_data = MusicianRequestSerializer(recent_requests, many=True).data

        return Response(
            {
                "monthly_data": list(reversed(monthly_data)),
                "instrument_distribution": list(instrument_distribution),
                "recent_activity": recent_data,
            }
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# City Management Endpoints
# =============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def dashboard_stats_extended(request):
    """Get extended dashboard statistics including city breakdown"""
    try:
        # Basic request counts
        total_requests = MusicianRequest.objects.count()
        pending_requests = MusicianRequest.objects.filter(status="pending").count()
        approved_requests = MusicianRequest.objects.filter(status="approved").count()
        rejected_requests = MusicianRequest.objects.filter(status="rejected").count()

        # Musician counts
        total_musicians = Musician.objects.filter(is_active=True).count()

        # City stats
        partner_cities = City.objects.filter(status="partner", is_active=True).count()
        expansion_cities = City.objects.filter(
            status="expansion", is_active=True
        ).count()
        planning_cities = City.objects.filter(status="planning", is_active=True).count()

        # Top cities by requests
        top_cities = (
            MusicianRequest.objects.values("city", "state")
            .annotate(
                total=Count("id"),
                pending=Count("id", filter=Q(status="pending")),
            )
            .order_by("-total")[:5]
        )

        return Response(
            {
                "requests": {
                    "total": total_requests,
                    "pending": pending_requests,
                    "approved": approved_requests,
                    "rejected": rejected_requests,
                },
                "musicians": {
                    "total": total_musicians,
                },
                "cities": {
                    "partner": partner_cities,
                    "expansion": expansion_cities,
                    "planning": planning_cities,
                },
                "top_cities": list(top_cities),
            }
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def requests_by_city(request):
    """Get requests grouped by city"""
    try:
        # Aggregate requests by city/state
        city_stats = (
            MusicianRequest.objects.values("city", "state")
            .annotate(
                total_requests=Count("id"),
                pending_requests=Count("id", filter=Q(status="pending")),
                approved_requests=Count("id", filter=Q(status="approved")),
                rejected_requests=Count("id", filter=Q(status="rejected")),
            )
            .order_by("-total_requests")
        )

        # Add active musicians count for each city
        result = []
        for stat in city_stats:
            active_musicians = Musician.objects.filter(
                city__iexact=stat["city"], state__iexact=stat["state"], is_active=True
            ).count()

            stat["active_musicians"] = active_musicians

            # Check if city is registered
            try:
                city_obj = City.objects.get(
                    name__iexact=stat["city"], state__iexact=stat["state"]
                )
                stat["city_obj"] = {
                    "id": city_obj.id,
                    "status": city_obj.status,
                    "status_display": city_obj.get_status_display(),
                    "is_active": city_obj.is_active,
                }
            except City.DoesNotExist:
                stat["city_obj"] = None

            result.append(stat)

        return Response(result)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def requests_by_city_detail(request, city, state):
    """Get requests for a specific city"""
    try:
        status_filter = request.GET.get("status")

        requests_qs = MusicianRequest.objects.filter(
            city__iexact=city, state__iexact=state
        ).order_by("-created_at")

        if status_filter and status_filter != "all":
            requests_qs = requests_qs.filter(status=status_filter)

        serializer = MusicianRequestAdminSerializer(requests_qs, many=True)

        # Get city info if registered
        city_info = None
        try:
            city_obj = City.objects.get(name__iexact=city, state__iexact=state)
            city_info = CitySerializer(city_obj).data
        except City.DoesNotExist:
            pass

        return Response(
            {
                "city": city,
                "state": state,
                "city_info": city_info,
                "requests": serializer.data,
            }
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsAdminUser])
def city_list_create(request):
    """List all cities or create a new one"""
    try:
        if request.method == "GET":
            status_filter = request.GET.get("status")
            cities = City.objects.filter(is_active=True)

            if status_filter:
                cities = cities.filter(status=status_filter)

            serializer = CitySerializer(cities, many=True)
            return Response(serializer.data)

        elif request.method == "POST":
            serializer = CityCreateSerializer(data=request.data)
            if serializer.is_valid():
                city = serializer.save(created_by=request.user)
                return Response(
                    CitySerializer(city).data, status=status.HTTP_201_CREATED
                )
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated, IsAdminUser])
def city_detail(request, pk):
    """Get, update or delete a city"""
    try:
        city = City.objects.get(pk=pk)
    except City.DoesNotExist:
        return Response(
            {"error": "Cidade não encontrada"}, status=status.HTTP_404_NOT_FOUND
        )

    try:
        if request.method == "GET":
            serializer = CitySerializer(city)
            return Response(serializer.data)

        elif request.method == "PUT":
            serializer = CityCreateSerializer(city, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(CitySerializer(city).data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        elif request.method == "DELETE":
            # Soft delete - just mark as inactive
            city.is_active = False
            city.save()
            return Response({"message": "Cidade desativada com sucesso"})

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminUser])
def city_change_status(request, pk):
    """Change city status"""
    try:
        city = City.objects.get(pk=pk)
    except City.DoesNotExist:
        return Response(
            {"error": "Cidade não encontrada"}, status=status.HTTP_404_NOT_FOUND
        )

    try:
        new_status = request.data.get("status")

        if new_status not in ["partner", "expansion", "planning"]:
            return Response(
                {"error": "Status inválido. Use: partner, expansion ou planning"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        city.status = new_status
        city.save()

        return Response(
            {
                "message": f"Status alterado para {city.get_status_display()}",
                "city": CitySerializer(city).data,
            }
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
