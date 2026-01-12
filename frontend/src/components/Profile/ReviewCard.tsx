import React from 'react';
import { Star } from 'lucide-react';

interface Review {
  id: number;
  rated_by_name: string;
  rated_by_avatar: string | null;
  rating: number;
  comment: string;
  time_ago: string;
}

interface ReviewCardProps {
  review: Review;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {review.rated_by_avatar ? (
            <img src={review.rated_by_avatar} alt={review.rated_by_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold">
              {review.rated_by_name[0]}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900">{review.rated_by_name}</h4>
            <span className="text-sm text-gray-500">há {review.time_ago}</span>
          </div>

          <div className="flex items-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                }`}
              />
            ))}
          </div>

          {review.comment && (
            <p className="text-gray-700 text-sm">{review.comment}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewCard;
