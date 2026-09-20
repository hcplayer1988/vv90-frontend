"""Views for the termine API."""

from rest_framework import filters, viewsets
from rest_framework.permissions import AllowAny

from accounts.api.permissions import IsVorstand

from .pagination import TerminePagination
from .serializers import TerminSerializer
from ..models import Termin


class TerminViewSet(viewsets.ModelViewSet):
    """Club events: anyone can view, only Vorstand/Admin/Owner can manage.

    - list/retrieve: public (no authentication required)
    - create/update/partial_update/destroy: Vorstand, Admin, or the platform owner
    - list is paginated (?page=&page_size=<10|20|50>), with an optional
      ?typ=<TerminTyp> filter and ?alle=1 to bypass pagination entirely
      (used by the calendar view, which needs every Termin at once - see
      TerminePagination)
    """

    queryset = Termin.objects.all()
    serializer_class = TerminSerializer
    pagination_class = TerminePagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['start']
    ordering = ['start']

    def get_queryset(self):
        queryset = Termin.objects.all()
        typ = self.request.query_params.get('typ')
        if typ:
            queryset = queryset.filter(typ=typ)
        return queryset

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsVorstand()]

    def perform_create(self, serializer):
        """Sets the creator automatically to the currently logged-in user."""
        serializer.save(erstellt_von=self.request.user)
