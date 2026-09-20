from core.pagination import StandardResultsSetPagination


class KommentarPagination(StandardResultsSetPagination):
    """Same as StandardResultsSetPagination, but supports ?antworten=1 to
    bypass pagination and return the full, unpaginated list of replies for
    a post instead. Only top-level comments are paginated for real (the
    default list, filtered via ?beitrag=<id>) - a thread's total reply
    volume is small enough in practice that splitting replies across pages
    too isn't worth the added complexity, and replies always need to be
    shown fully nested under their (possibly paginated) parent comment
    anyway."""

    def paginate_queryset(self, queryset, request, view=None):
        if request.query_params.get('antworten') == '1':
            return None
        return super().paginate_queryset(queryset, request, view=view)
