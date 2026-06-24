import React, { useState, useEffect } from 'react';
import { apiUrl } from '@/config/api';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Star, MessageCircle, Info, ChevronRight } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface ServiceOption {
  id: number;
  name_en: string;
  name_am: string;
  name_om: string;
}

const Feedback = () => {
  const { t, i18n } = useTranslation();
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');

  const { user } = useUser();
  const navigate = useNavigate();

  const feedbackCategories = [
    { id: 'food_quality', name: 'Food Quality' },
    { id: 'service_speed', name: 'Service Speed' },
    { id: 'cleanliness', name: 'Cleanliness & Hygiene' },
    { id: 'staff_behavior', name: 'Staff Professionalism' },
    { id: 'value_for_money', name: 'Value for Money' },
    { id: 'room_comfort', name: 'Room Comfort' },
    { id: 'amenities', name: 'Facilities & Amenities' },
    { id: 'overall_experience', name: 'Overall Experience' },
  ];

  const handleSubmit = async () => {
    if (!selectedCategoryId || rating === 0 || !comment.trim()) {
      toast.error("Please select a category, rating, and write a comment.");
      return;
    }

    const selectedCategory = feedbackCategories.find(c => c.id === selectedCategoryId);

    const payload = {
      user_id: user ? user.id : null,
      service_id: null,
      category: selectedCategory ? selectedCategory.name : 'General',
      comment: comment,
      rating: rating,
    };

    try {
      const response = await fetch(apiUrl('/feedback.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success("Thank you for your feedback!");
        navigate('/');
      } else {
        toast.error(result.error || "Failed to submit feedback.");
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    }
  };

  const handleStarClick = (starRating: number) => {
    setRating(starRating);
  };

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

  return (
    <div className="bg-background flex max-w-[480px] md:max-w-full w-full flex-col overflow-hidden mx-auto min-h-screen pb-28">
      <main className="flex flex-col w-full flex-1 px-5 md:px-8 lg:px-12 xl:px-16 pt-14">
        {/* Two-column layout on larger viewports */}
        <div className="md:grid md:grid-cols-2 md:gap-8 md:items-start md:mt-6">
          
          {/* Left Column: Decorative Header */}
          <div className="text-center md:text-left md:sticky md:top-24 mb-8 md:mb-0 md:pr-4">
            <div className="w-16 h-16 rounded-full bg-golden/15 flex items-center justify-center mx-auto md:mx-0 mb-4">
              <MessageCircle className="w-8 h-8 text-golden" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 md:mb-3">{t('feedback.title')}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{t('feedback.description')}</p>
            
            <div className="hidden md:block mt-6 p-5 rounded-2xl bg-muted/40 border border-border/50 text-xs text-muted-foreground font-medium leading-relaxed">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-golden" strokeWidth={2.5} />
                <span className="font-bold text-[10px] uppercase tracking-wider text-foreground">Why Feedback Matters</span>
              </div>
              Your experience helps us continuously elevate our services. Every review is directly shared with management to ensure a premium hotel stay.
            </div>
          </div>

          {/* Right Column: Form sections */}
          <div className="space-y-5">
            {/* Category selector */}
            <div className="bg-card rounded-2xl border border-border/50 p-4">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Category</label>
              <Select value={selectedCategoryId ?? ''} onValueChange={setSelectedCategoryId}>
                <SelectTrigger className="rounded-xl border-border bg-background">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="general">{t('feedback.general_feedback')}</SelectItem>
                  <SelectSeparator />
                  {feedbackCategories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Star rating */}
            <div className="bg-card rounded-2xl border border-border/50 p-4">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('feedback.rating_label')}</label>
              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleStarClick(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-all duration-200 hover:scale-110 active:scale-95"
                    >
                      <Star
                        className={`h-9 w-9 transition-colors duration-200 ${
                          star <= (hoveredRating || rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-border'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <span className="text-xs font-medium text-golden mt-1 animate-in fade-in duration-200">
                    {ratingLabels[rating]}
                  </span>
                )}
              </div>
            </div>

            {/* Comment */}
            <div className="bg-card rounded-2xl border border-border/50 p-4">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">{t('feedback.comment_label')}</label>
              <Textarea
                placeholder={t('feedback.comment_placeholder')}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[120px] resize-none rounded-xl border-border bg-background"
              />
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              className="w-full h-12 rounded-2xl text-sm font-semibold bg-foreground hover:bg-foreground/90 text-background shadow-lg transition-all duration-200 hover:shadow-xl"
              disabled={!selectedCategoryId || rating === 0 || !comment.trim()}
            >
              {t('feedback.submit_button')}
            </Button>
          </div>

        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Feedback;
