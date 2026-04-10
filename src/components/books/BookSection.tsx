'use client';

import { Box, HStack, Link, Text, VStack } from '@chakra-ui/react';
import 'swiper/css';
import 'swiper/css/autoplay';
import 'swiper/css/free-mode';
import { Autoplay, FreeMode } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import { BookHorizontalCard, BookHorizontalCardData } from './BookHorizontalCard';

interface BookSectionProps {
  title: string;
  showAllLink?: string;
  books: BookHorizontalCardData[];
  onBookClick?: (bookId: string) => void;
}

export function BookSection({ title, showAllLink, books, onBookClick }: BookSectionProps) {
  return (
    <VStack align="start" gap={4} w="100%">
      {/* Header */}
      <HStack justify="space-between" align="center" w="100%">
        <Text fontSize="xl" fontWeight="semibold" color="primaryText.500">
          {title}
        </Text>
        {showAllLink && (
          <Link
            href={showAllLink}
            fontSize="sm"
            color="secondaryText.500"
            _hover={{ color: 'primary.500' }}
            transition="color 0.2s"
          >
            Show All
          </Link>
        )}
      </HStack>

      {/* Horizontal Scrollable Book List */}
      <Box
        w="100%"
        css={{
          '& .swiper-wrapper': {
            alignItems: 'flex-start',
          },
          '& .swiper-slide': {
            width: 'auto',
          },
        }}
      >
        {books.length === 0 ? (
          <Text fontSize="sm" color="secondaryText.500" py={8}>
            No books available
          </Text>
        ) : (
          <Swiper
            modules={[FreeMode, Autoplay]}
            freeMode={true}
            spaceBetween={16}
            slidesPerView="auto"
            grabCursor={true}
            autoplay={{
              delay: 3000,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            loop={false}
            speed={1000}
          >
            {books.map(book => (
              <SwiperSlide key={book.id}>
                <BookHorizontalCard book={book} onClick={onBookClick} />
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </Box>
    </VStack>
  );
}
