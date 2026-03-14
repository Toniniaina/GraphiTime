"""Compatibility module.

The GraphQL schema has been moved into the `app.graphql` package.
This file re-exports `schema` to avoid breaking existing imports.
"""

from .graphql.schema import schema  # noqa: F401
