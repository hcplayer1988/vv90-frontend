from core.pagination import StandardResultsSetPagination


class TerminePagination(StandardResultsSetPagination):
    """Same as StandardResultsSetPagination, but supports ?alle=1 to bypass
    pagination entirely and return the full, unpaginated list as a plain
    array. Needed by the calendar view, which computes recurring
    occurrences client-side (see utils/terminRecurrence.ts) and therefore
    needs every Termin at once, not just one page."""

    def paginate_queryset(self, queryset, request, view=None):
        if request.query_params.get('alle') == '1':
            return None
        return super().paginate_queryset(queryset, request, view=view)
