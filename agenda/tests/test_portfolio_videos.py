from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from agenda.models import Musician

User = get_user_model()


class PortfolioVideosAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="video_musician",
            email="video_musician@test.com",
            password="SenhaForte123!",
            first_name="Video",
            last_name="Tester",
        )
        self.musician = Musician.objects.create(
            user=self.user,
            instrument="guitar",
            instruments=["guitar"],
            city="Belo Horizonte",
            state="MG",
            is_active=True,
        )
        self.client.force_authenticate(user=self.user)

    def test_patch_valid_portfolio_videos(self):
        payload = {
            "portfolio_videos": [
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "https://vimeo.com/148751763",
            ]
        }
        resp = self.client.patch("/api/musicians/me/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("portfolio_videos", resp.data)
        self.assertEqual(len(resp.data["portfolio_videos"]), 2)
        self.assertEqual(resp.data["portfolio_videos"][0]["provider"], "youtube")
        self.assertIn("embed_url", resp.data["portfolio_videos"][0])

        self.musician.refresh_from_db()
        self.assertEqual(len(self.musician.portfolio_videos), 2)
        self.assertEqual(self.musician.portfolio_videos[1]["provider"], "vimeo")

    def test_patch_rejects_invalid_domain(self):
        resp = self.client.patch(
            "/api/musicians/me/",
            {"portfolio_videos": ["https://example.com/video.mp4"]},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("portfolio_videos", resp.data)

    def test_patch_rejects_more_than_three_videos(self):
        resp = self.client.patch(
            "/api/musicians/me/",
            {
                "portfolio_videos": [
                    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                    "https://vimeo.com/148751763",
                    "https://www.youtube.com/watch?v=9bZkp7q19f0",
                    "https://vimeo.com/76979871",
                ]
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("portfolio_videos", resp.data)

    def test_public_profile_exposes_portfolio_videos(self):
        self.musician.portfolio_videos = [
            {
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "provider": "youtube",
                "video_id": "dQw4w9WgXcQ",
                "embed_url": "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0",
            }
        ]
        self.musician.save(update_fields=["portfolio_videos"])

        resp = self.client.get(f"/api/musicians/public/{self.musician.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("portfolio_videos", resp.data)
        self.assertEqual(len(resp.data["portfolio_videos"]), 1)
