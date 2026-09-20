"""Views for the forum API."""

from django.db.models import Count
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.pagination import StandardResultsSetPagination

from .pagination import KommentarPagination
from .permissions import IsAuthorOrModerator
from .serializers import BeitragSerializer, KommentarSerializer
from ..models import Beitrag, Kommentar, KommentarBewertung


class BeitragViewSet(viewsets.ModelViewSet):
    """Forum posts: any authenticated member can read/create; editing or
    deleting is restricted to the author or a moderator (see permissions).

    list supports:
    - ?search=<text> (matches titel/text, case-insensitive)
    - ?kategorie=<value>
    - ?meine=1 (only the current user's own posts)
    - ?ordering=erstellt_am|-erstellt_am|anzahl_kommentare|-anzahl_kommentare
      (default: -erstellt_am, i.e. newest first)
    - ?page=&page_size=<10|20|50>

    All of the above run server-side now (not just pagination) - otherwise
    search/sort/filter would only ever apply to whichever single page
    happens to be loaded.
    """

    queryset = Beitrag.objects.all()
    serializer_class = BeitragSerializer
    permission_classes = [IsAuthorOrModerator]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['titel', 'text']
    ordering_fields = ['erstellt_am', 'anzahl_kommentare']
    ordering = ['-erstellt_am']

    def get_queryset(self):
        # Annotated once here rather than via source='kommentare.count' on
        # the serializer - avoids one extra query per post and lets
        # "anzahl_kommentare" double as an ordering field.
        queryset = Beitrag.objects.annotate(anzahl_kommentare=Count('kommentare'))
        kategorie = self.request.query_params.get('kategorie')
        if kategorie:
            queryset = queryset.filter(kategorie=kategorie)
        if self.request.query_params.get('meine') == '1':
            queryset = queryset.filter(autor=self.request.user)
        return queryset

    def perform_create(self, serializer):
        """Sets the author automatically to the currently logged-in user."""
        serializer.save(autor=self.request.user)

    @action(detail=False, methods=['get'])
    def kategorien(self, request):
        """Returns the distinct, non-empty Kategorie values used across ALL
        posts (not just the current page) - the frontend needs this
        separately now that it no longer has every post loaded at once to
        derive the filter chips from."""
        werte = (
            Beitrag.objects.exclude(kategorie='')
            .order_by('kategorie')
            .values_list('kategorie', flat=True)
            .distinct()
        )
        return Response(list(werte))


class KommentarViewSet(viewsets.ModelViewSet):
    """Forum comments. Supports filtering by post via ?beitrag=<id>, replying
    to another comment via antwort_auf, and liking/disliking via /bewerten/.

    list returns only TOP-LEVEL comments (antwort_auf is null), paginated -
    those are what can get numerous on an active thread. Pass ?antworten=1
    to instead get the complete, unpaginated list of replies for the post
    (antwort_auf is not null); see KommentarPagination for why replies
    themselves aren't paginated.
    """

    serializer_class = KommentarSerializer
    permission_classes = [IsAuthorOrModerator]
    pagination_class = KommentarPagination

    def get_queryset(self):
        """Filters comments down to a single post, and (for list) further
        down to either top-level comments or replies depending on
        ?antworten=."""
        queryset = Kommentar.objects.all()
        beitrag_id = self.request.query_params.get('beitrag')
        if beitrag_id:
            queryset = queryset.filter(beitrag_id=beitrag_id)
        if self.action == 'list':
            if self.request.query_params.get('antworten') == '1':
                queryset = queryset.filter(antwort_auf__isnull=False)
            else:
                queryset = queryset.filter(antwort_auf__isnull=True)
        return queryset.order_by('erstellt_am')

    def get_serializer_context(self):
        """Passes the request through so the serializer can resolve 'meine_bewertung'."""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        """Sets the author automatically to the currently logged-in user."""
        serializer.save(autor=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def bewerten(self, request, pk=None):
        """Likes or dislikes a comment.

        Voting the same type again removes the reaction (toggle off).
        Voting the opposite type replaces the existing one.
        Body: {"typ": "like"} or {"typ": "dislike"}.
        """
        kommentar = self.get_object()
        typ = request.data.get('typ')
        if typ not in dict(KommentarBewertung.BEWERTUNG_CHOICES):
            return Response(
                {"detail": "typ muss 'like' oder 'dislike' sein."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        bestehende = KommentarBewertung.objects.filter(kommentar=kommentar, user=request.user).first()
        if bestehende and bestehende.typ == typ:
            bestehende.delete()
            meine_bewertung = None
        elif bestehende:
            bestehende.typ = typ
            bestehende.save()
            meine_bewertung = typ
        else:
            KommentarBewertung.objects.create(kommentar=kommentar, user=request.user, typ=typ)
            meine_bewertung = typ

        return Response(
            {
                "likes": kommentar.like_count(),
                "dislikes": kommentar.dislike_count(),
                "meine_bewertung": meine_bewertung,
            },
            status=status.HTTP_200_OK,
        )
