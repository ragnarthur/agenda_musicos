import React from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';

interface Review {
  id: number;
  rated_by_name: string;
  rated_by_avatar: string | null;
  rating: number;
  comment?: string;
  time_ago: string;
}

interface ReviewCardProps {
  review: Review;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm hover:shadow-lg border border-gray-100 dark:border-gray-700 transition-all"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0 ring-2 ring-blue-500/10 dark:ring-blue-400/10">
          {review.rated_by_avatar ? (
            <img
              src={review.rated_by_avatar}
              alt={review.rated_by_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold">
              {review.rated_by_name[0]}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-white">{review.rated_by_name}</h4>
            <span className="text-sm text-gray-500 dark:text-gray-500">há {review.time_ago}</span>
          </div>

          <div className="flex items-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 transition-all ${
                  i < review.rating
                    ? 'text-yellow-400 fill-yellow-400 hover:drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            ))}
          </div>

          {review.comment && (
            <p className="text-gray-700 dark:text-gray-300 text-sm">{review.comment}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ReviewCard;
