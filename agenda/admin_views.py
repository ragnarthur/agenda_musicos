from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Sum, Q
from django.utils import timezone
from datetime import datetime, timedelta
from calendar import month_name
from ..models import MusicianRequest, Event
from ..serializers import MusicianRequestSerializer, EventSerializer


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
        serializer = EventSerializer(events, many=True)
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
            requests = MusicianRequest.objects.filter(
                email__iexact=email
            ).order_by("-created_at")
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
