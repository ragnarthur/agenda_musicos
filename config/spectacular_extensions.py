from drf_spectacular.extensions import OpenApiAuthenticationExtension
from drf_spectacular.plumbing import build_bearer_security_scheme_object


class CookieOrHeaderJWTAuthenticationScheme(OpenApiAuthenticationExtension):
    """
    drf-spectacular can't infer custom auth classes by default.

    We model this authenticator as a standard Bearer JWT scheme for OpenAPI docs.
    Cookie fallback is an implementation detail and should not change the schema.
    """

    target_class = "config.authentication.CookieOrHeaderJWTAuthentication"
    name = "BearerAuth"

    def get_security_definition(self, auto_schema):  # noqa: ARG002
        return build_bearer_security_scheme_object(
            header_name="Authorization",
            token_prefix="Bearer",
            bearer_format="JWT",
        )
