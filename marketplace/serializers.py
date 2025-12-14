from rest_framework import serializers
from .models import Gig, GigApplication


class GigApplicationSerializer(serializers.ModelSerializer):
    """Candidatura de músico a uma oportunidade."""
    musician_name = serializers.SerializerMethodField()

    class Meta:
        model = GigApplication
        fields = [
            'id',
            'gig',
            'musician',
            'musician_name',
            'cover_letter',
            'expected_fee',
            'status',
            'created_at',
        ]
        read_only_fields = ['id', 'gig', 'musician', 'status', 'created_at']

    def get_musician_name(self, obj):
        return obj.musician.user.get_full_name() or obj.musician.user.username


class GigSerializer(serializers.ModelSerializer):
    """Oportunidade de show/vaga publicada no marketplace."""
    created_by_name = serializers.SerializerMethodField()
    applications_count = serializers.SerializerMethodField()
    applications = GigApplicationSerializer(many=True, read_only=True)
    my_application = serializers.SerializerMethodField()

    class Meta:
        model = Gig
        fields = [
            'id',
            'title',
            'description',
            'city',
            'location',
            'event_date',
            'start_time',
            'end_time',
            'budget',
            'contact_name',
            'contact_email',
            'contact_phone',
            'genres',
            'status',
            'created_by',
            'created_by_name',
            'applications_count',
            'applications',
            'my_application',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'status',
            'created_by',
            'created_at',
            'updated_at',
            'applications_count',
            'applications',
            'my_application',
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return 'Cliente'
        return obj.created_by.get_full_name() or obj.created_by.username

    def get_applications_count(self, obj):
        try:
            return obj.applications.count()
        except Exception:
            return 0

    def get_my_application(self, obj):
        """Retorna a candidatura do músico logado (se existir)."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None

        musician = getattr(request.user, 'musician_profile', None)
        if not musician:
            return None

        try:
            application = obj.applications.get(musician=musician)
        except GigApplication.DoesNotExist:
            return None

        return GigApplicationSerializer(application).data

    def to_representation(self, instance):
        """Oculta candidaturas completas para usuários que não são donos da vaga."""
        data = super().to_representation(instance)
        request = self.context.get('request')
        is_owner = request and request.user.is_authenticated and instance.created_by_id == request.user.id

        if not is_owner:
            data.pop('applications', None)

        return data
