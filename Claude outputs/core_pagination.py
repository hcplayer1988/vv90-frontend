from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """Shared page-number pagination for the whole API. The client selects
    the page size explicitly via ?page_size=<10|20|50> (matching the
    existing frontend page-size picker), defaulting to 10 when omitted."""

    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50
