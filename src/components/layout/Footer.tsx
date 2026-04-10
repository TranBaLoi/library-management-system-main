'use client';

import { Box, Grid, HStack, Link, Text, VStack } from '@chakra-ui/react';
import { FaFacebook, FaInstagram, FaLinkedin, FaTwitter } from 'react-icons/fa';
import { FiClock, FiMail, FiMapPin, FiPhone } from 'react-icons/fi';

export function Footer() {
  return (
    <Box as="footer" bg="subtleBg" borderTop="1px" borderColor="gray.200">
      <VStack gap={0} px={6} pt={8} align="stretch">
        {/* Main Footer Content */}
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={8}>
          {/* Contact Information */}
          <VStack align="start" gap={3}>
            <Text fontSize="md" fontWeight="semibold" color="primaryText.500">
              Contact
            </Text>
            <VStack align="start" gap={3}>
              {/* Email */}
              <HStack gap={3} align="start">
                <Box color="primary.500" flexShrink={0} mt={0.5}>
                  <FiMail size={18} />
                </Box>
                <Link
                  href="mailto:contact@library.com"
                  fontSize="sm"
                  color="secondaryText.500"
                  _hover={{ color: 'primary.500', textDecoration: 'underline' }}
                >
                  contact@library.com
                </Link>
              </HStack>

              {/* Phone */}
              <HStack gap={3} align="start">
                <Box color="primary.500" flexShrink={0} mt={0.5}>
                  <FiPhone size={18} />
                </Box>
                <Link
                  href="tel:+84123456789"
                  fontSize="sm"
                  color="secondaryText.500"
                  _hover={{ color: 'primary.500', textDecoration: 'underline' }}
                >
                  +84 123 456 789
                </Link>
              </HStack>

              {/* Address */}
              <HStack gap={3} align="start">
                <Box color="primary.500" flexShrink={0} mt={0.5}>
                  <FiMapPin size={18} />
                </Box>
                <Text fontSize="sm" color="secondaryText.500">
                  123 Library Street, City, Country
                </Text>
              </HStack>
            </VStack>
          </VStack>

          {/* Working Hours */}
          <VStack align="start" gap={3}>
            <Text fontSize="md" fontWeight="semibold" color="primaryText.500">
              Working Hours
            </Text>
            <VStack align="start" gap={2}>
              <HStack gap={3} align="start">
                <Box color="primary.500" flexShrink={0} mt={0.5}>
                  <FiClock size={18} />
                </Box>
                <VStack align="start" gap={1}>
                  <Text fontSize="sm" color="secondaryText.500">
                    Monday - Friday: 8:00 AM - 5:00 PM
                  </Text>
                  <Text fontSize="sm" color="secondaryText.500">
                    Saturday: 8:00 AM - 12:00 PM
                  </Text>
                  <Text fontSize="sm" color="secondaryText.500">
                    Sunday: Closed
                  </Text>
                </VStack>
              </HStack>
            </VStack>
          </VStack>

          {/* Social Media */}
          <VStack align="start" gap={3}>
            <Text fontSize="md" fontWeight="semibold" color="primaryText.500">
              Follow Us
            </Text>
            <HStack gap={3}>
              <Link
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                color="secondaryText.500"
                _hover={{ color: 'primary.500', transform: 'scale(1.15)' }}
                transition="all 0.2s"
              >
                <FaFacebook size={22} />
              </Link>
              <Link
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                color="secondaryText.500"
                _hover={{ color: 'primary.500', transform: 'scale(1.15)' }}
                transition="all 0.2s"
              >
                <FaTwitter size={22} />
              </Link>
              <Link
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                color="secondaryText.500"
                _hover={{ color: 'primary.500', transform: 'scale(1.15)' }}
                transition="all 0.2s"
              >
                <FaLinkedin size={22} />
              </Link>
              <Link
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                color="secondaryText.500"
                _hover={{ color: 'primary.500', transform: 'scale(1.15)' }}
                transition="all 0.2s"
              >
                <FaInstagram size={22} />
              </Link>
            </HStack>
          </VStack>
        </Grid>

        {/* Copyright */}
        <Box borderTop="1px" borderColor="gray.200" paddingTop={4}>
          <Text fontSize="sm" fontWeight="semibold" color="secondaryText.500" textAlign="center">
            Copyright © {new Date().getFullYear()} Library Management System. All rights reserved.
          </Text>
        </Box>
      </VStack>
    </Box>
  );
}
