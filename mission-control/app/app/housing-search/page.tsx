"use client";

import { useState, useEffect } from "react";
import {
  Home, ExternalLink, MessageCircle, Mail, Filter, Search,
  MapPin, Phone, Globe, ChevronDown, StickyNote, Check
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────

interface Listing {
  id: string;
  title: string;
  location: string;
  neighborhood: "Pererenan" | "Canggu" | "North Canggu" | "Tibubeneng" | "Berawa" | "Babakan";
  beds: number;
  baths: number;
  hasPool: boolean;
  priceMin: number;
  priceMax: number;
  priceNote?: string;
  status: "available" | "confirm" | "rented";
  tier: 1 | 2 | 3 | "watch";
  source: string;
  sourceUrl: string;
  imgUrl: string;
  tags: { label: string; type: "good" | "warn" | "neutral" }[];
  contactName: string;
  whatsapp?: string;
  email?: string;
  notes?: string;
  highlight?: boolean;
}

interface Source {
  id: string;
  name: string;
  type: "facebook" | "website" | "telegram";
  url: string;
  area: string;
  city: string;
  country: string;
  focus: string;
  notes: string;
}

// ── Data ──────────────────────────────────────────────────────────

const LISTINGS: Listing[] = [
  {
    id: "l1",
    title: "2BR Villa — Tumbak Bayuh",
    location: "Tumbak Bayuh, Pererenan border",
    neighborhood: "Pererenan",
    beds: 2, baths: 2, hasPool: true,
    priceMin: 28_000_000, priceMax: 28_000_000,
    status: "confirm", tier: 1,
    source: "balilongtermrentals.com",
    sourceUrl: "https://www.balilongtermrentals.com/2-beroom-villa-in-tumbak-bayuh/",
    imgUrl: "https://www.balilongtermrentals.com/wp-content/uploads/2025/03/1_compressed-2.jpg",
    tags: [
      { label: "AC", type: "good" }, { label: "WiFi", type: "good" },
      { label: "Fully furnished", type: "good" }, { label: "Daily cleaning", type: "good" },
      { label: "Storage", type: "good" }, { label: "Cat policy: ask", type: "warn" },
    ],
    contactName: "Bali Long Term Rentals",
    whatsapp: "628113960868",
    email: "info@balilongtermrentals.com",
  },
  {
    id: "l2",
    title: "2BR Modern Villa — Near Pererenan Beach",
    location: "Canggu — 5 min to Pererenan Beach",
    neighborhood: "Canggu",
    beds: 2, baths: 3, hasPool: true,
    priceMin: 23_000_000, priceMax: 28_000_000,
    status: "available", tier: 1,
    source: "rumah123.com",
    sourceUrl: "https://www.rumah123.com/en/property/badung-canggu/2-bedroom-modern-villa-in-canggu-5-minutes-to-beach-hor40746144/",
    imgUrl: "https://picture.rumah123.com/r123-images/300x300-crop/customer/1775549/2b473117eca7c4d231fcd430ee4a0580.jpg",
    tags: [
      { label: "Free WiFi", type: "good" }, { label: "Housekeeping 2x/week", type: "good" },
      { label: "Fully furnished", type: "good" }, { label: "Updated Mar 26 2026", type: "good" },
      { label: "Cat policy: ask", type: "warn" },
    ],
    contactName: "BDA Real Estate",
  },
  {
    id: "l3",
    title: "2BR Villa — Jl. Tumbak Bayuh, Pererenan",
    location: "Jl. Tumbak Bayuh, Pererenan",
    neighborhood: "Pererenan",
    beds: 2, baths: 2, hasPool: true,
    priceMin: 27_000_000, priceMax: 27_000_000,
    priceNote: "Yearly listing — negotiate monthly",
    status: "confirm", tier: 1,
    source: "rumah123.com",
    sourceUrl: "https://www.rumah123.com/en/property/badung-canggu/for-rent-2-bedroom-villa-at-jl-tumbak-bayuh-pererenan-canggu-hor16324242/",
    imgUrl: "https://picture.rumah123.com/r123-images/300x300-crop/customer/10230/2024-02-09-03-19-06-a4f206d0-387b-44d4-9397-b51455f04da3.jpg",
    tags: [
      { label: "3 AC units", type: "good" }, { label: "Fully furnished", type: "good" },
      { label: "Carport", type: "good" }, { label: "In Pererenan ✓", type: "good" },
      { label: "Negotiate monthly", type: "warn" }, { label: "Cat policy: ask", type: "warn" },
    ],
    contactName: "Arul — LJH Realty Grand Canggu",
  },
  {
    id: "l4",
    title: "3BR Tropical Villa — Padonan, North Canggu",
    location: "Padonan, North Canggu · Code: CA0992Y",
    neighborhood: "North Canggu",
    beds: 3, baths: 3, hasPool: false,
    priceMin: 35_000_000, priceMax: 35_000_000,
    status: "available", tier: 1,
    source: "balilongtermrentals.com",
    sourceUrl: "https://www.balilongtermrentals.com/beautiful-tropical-villa-north-canggu-padonan/",
    imgUrl: "https://www.balilongtermrentals.com/wp-content/uploads/2018/05/IMG_1967.jpg",
    tags: [
      { label: "Fiber optic WiFi", type: "good" }, { label: "Walk-in closets", type: "good" },
      { label: "Rice field views", type: "good" }, { label: "Rooftop terrace", type: "good" },
      { label: "Dog allowed (ask re: cats)", type: "warn" },
    ],
    contactName: "Bali Long Term Rentals",
    whatsapp: "628113960868",
    email: "info@balilongtermrentals.com",
  },
  {
    id: "l5",
    title: "Pertama Villa — Canggu Beach",
    location: "Jalan Pura Dalem, Canggu — 70m from beach",
    neighborhood: "Canggu",
    beds: 2, baths: 3, hasPool: true,
    priceMin: 32_500_000, priceMax: 32_500_000,
    status: "confirm", tier: 1,
    source: "rentroombali.com",
    sourceUrl: "https://rentroombali.com/property/pertama-villa-canggu/",
    imgUrl: "https://rentroombali.com/wp-content/uploads/2026/03/pertama-villa-canggu-1.jpg",
    tags: [
      { label: "AC", type: "good" }, { label: "WiFi", type: "good" },
      { label: "Closed living room", type: "good" }, { label: "Balcony + terrace", type: "good" },
      { label: "Security", type: "good" }, { label: "Cat policy: ask", type: "warn" },
    ],
    contactName: "RentRoomBali",
    whatsapp: "6285857155930",
    email: "info@rentroombali.com",
  },
  {
    id: "l6",
    title: "⭐ 2BR Mold-Free Modern Villa — North Canggu",
    location: "North Canggu · Available from March 27, 2026",
    neighborhood: "North Canggu",
    beds: 2, baths: 2, hasPool: true,
    priceMin: 37_000_000, priceMax: 37_000_000,
    status: "available", tier: 2,
    highlight: true,
    source: "balivillahub.com",
    sourceUrl: "https://www.balivillahub.com/en",
    imgUrl: "",
    tags: [
      { label: "Explicitly mold-free", type: "good" }, { label: "Modern tropical", type: "good" },
      { label: "Direct owner contact", type: "good" }, { label: "Cat policy: ask", type: "warn" },
    ],
    contactName: "Direct owner via BaliVillaHub",
  },
  {
    id: "l7",
    title: "3BR Villa — Heart of Canggu (Batu Bolong)",
    location: "Batu Bolong / Echo Beach · Code: CA1635Y",
    neighborhood: "Canggu",
    beds: 3, baths: 2, hasPool: true,
    priceMin: 33_000_000, priceMax: 40_000_000,
    priceNote: "40M/mo or ~33M/mo for 6 months",
    status: "confirm", tier: 2,
    source: "balilongtermrentals.com",
    sourceUrl: "https://www.balilongtermrentals.com/3bedrooms-villa-in-the-heart-of-canggu/",
    imgUrl: "https://www.balilongtermrentals.com/wp-content/uploads/2025/07/3-Bedrooms-villa-in-the-Heart-of-Canggu-23-scaled.jpg",
    tags: [
      { label: "200 Mbps WiFi", type: "good" }, { label: "3 AC units", type: "good" },
      { label: "LG washer + fridge", type: "good" }, { label: "Prime location", type: "good" },
      { label: "Cat policy: ask", type: "warn" },
    ],
    contactName: "Bali Long Term Rentals",
    whatsapp: "628113960868",
    email: "info@balilongtermrentals.com",
  },
  {
    id: "l8",
    title: "Tribeca Villas — Tibubeneng, Canggu",
    location: "Jalan Canggu Permai, Tibubeneng",
    neighborhood: "Tibubeneng",
    beds: 2, baths: 1, hasPool: true,
    priceMin: 39_000_000, priceMax: 49_000_000,
    priceNote: "Lower unit at 39M — negotiate",
    status: "confirm", tier: 2,
    source: "rentroombali.com",
    sourceUrl: "https://rentroombali.com/property/tribeca-villas-canggu/",
    imgUrl: "https://rentroombali.com/wp-content/uploads/2026/01/tribeca-villa-canggu-1.jpg",
    tags: [
      { label: "Private pool", type: "good" }, { label: "Enclosed living", type: "good" },
      { label: "Complex of 5 villas", type: "good" }, { label: "Negotiate lower unit", type: "warn" },
      { label: "Cat policy: ask", type: "warn" },
    ],
    contactName: "RentRoomBali",
    whatsapp: "6285857155930",
    email: "info@rentroombali.com",
  },
  {
    id: "l9",
    title: "3BR Jungle View Villa — Pererenan",
    location: "Pererenan · Code: CA1570Y",
    neighborhood: "Pererenan",
    beds: 3, baths: 3, hasPool: true,
    priceMin: 42_000_000, priceMax: 42_000_000,
    priceNote: "2M over budget — negotiate",
    status: "confirm", tier: 2,
    source: "balilongtermrentals.com",
    sourceUrl: "https://www.balilongtermrentals.com/3-bedrooms-villa-in-pererenan-with-jungle-view/",
    imgUrl: "https://www.balilongtermrentals.com/wp-content/uploads/2025/03/THEXX.ID-eva-villa-5-scaled.jpg",
    tags: [
      { label: "In Pererenan ✓", type: "good" }, { label: "Jungle views", type: "good" },
      { label: "AC all bedrooms", type: "good" }, { label: "50 Mbps WiFi", type: "good" },
      { label: "2x/week cleaning", type: "good" }, { label: "Slightly over budget", type: "warn" },
      { label: "Cat policy: ask", type: "warn" },
    ],
    contactName: "Bali Long Term Rentals",
    whatsapp: "628113960868",
    email: "info@balilongtermrentals.com",
  },
  {
    id: "l10",
    title: "⭐ 2BR Joglo Villa — Pererenan (Ask re: May)",
    location: "Pererenan · Code: CA1392Y",
    neighborhood: "Pererenan",
    beds: 2, baths: 2, hasPool: true,
    priceMin: 30_000_000, priceMax: 30_000_000,
    priceNote: "Price when available",
    status: "rented", tier: "watch",
    highlight: true,
    source: "balilongtermrentals.com",
    sourceUrl: "https://www.balilongtermrentals.com/brand-new-2-bedroom-joglo-villa-in-pererenan/",
    imgUrl: "https://www.balilongtermrentals.com/wp-content/uploads/2022/11/314899566_817433989545892_9213596390977317965_n.jpg",
    tags: [
      { label: "In Pererenan ✓", type: "good" }, { label: "75 Mbps WiFi", type: "good" },
      { label: "Daily cleaning", type: "good" }, { label: "Big garden", type: "good" },
      { label: "Currently rented — ask re: May 7", type: "warn" },
    ],
    contactName: "Bali Long Term Rentals",
    whatsapp: "628113960868",
    email: "info@balilongtermrentals.com",
  },
  {
    id: "l11",
    title: "Villa Koko — Padang Linjong, Canggu",
    location: "Padang Linjong, Canggu · Rented until April 2026",
    neighborhood: "Canggu",
    beds: 3, baths: 3, hasPool: true,
    priceMin: 38_000_000, priceMax: 38_000_000,
    priceNote: "Rented until April — could free up for May",
    status: "rented", tier: "watch",
    source: "balicoconutliving.com",
    sourceUrl: "https://balicoconutliving.com/bali-villa-monthly-rental/Canggu/3278-V005-3116/Villa-Koko",
    imgUrl: "https://balicoconutliving.com/upload/image/property/6JOQubAWRBKrnehvn2xd.jpeg",
    tags: [
      { label: "All en-suite", type: "good" }, { label: "Gazebo", type: "good" },
      { label: "Garden + parking", type: "good" }, { label: "May free up exactly on time", type: "warn" },
      { label: "Cat policy: ask", type: "warn" },
    ],
    contactName: "Bali Coconut Living",
  },
  // ── NEW LISTINGS ────────────────────────────────────────────────
  {
    id: "l12",
    title: "Homey 3BR House — Tiying Titul, North Canggu",
    location: "Tiying Titul, North Canggu · Code: CA1530Y",
    neighborhood: "North Canggu",
    beds: 3, baths: 3, hasPool: true,
    priceMin: 39_000_000, priceMax: 39_000_000,
    status: "confirm", tier: 2,
    source: "balilongtermrentals.com",
    sourceUrl: "https://www.balilongtermrentals.com/homey-3-bedroom-house/",
    imgUrl: "https://www.balilongtermrentals.com/wp-content/uploads/2024/11/NAG6686-HDR-scaled.jpg",
    tags: [
      { label: "Private pool", type: "good" }, { label: "WiFi", type: "good" },
      { label: "Cleaning 2x/week", type: "good" }, { label: "Pool + garden maintenance", type: "good" },
      { label: "Cat policy: ask", type: "warn" },
    ],
    contactName: "Bali Long Term Rentals",
    whatsapp: "628113960868",
    email: "info@balilongtermrentals.com",
  },
  {
    id: "l13",
    title: "Villa Ivana A15 — Kayu Tulang, Canggu",
    location: "Jl. Pura Wates, Babakan, Canggu · Code: V005-4542",
    neighborhood: "Babakan",
    beds: 2, baths: 2, hasPool: true,
    priceMin: 35_000_000, priceMax: 35_000_000,
    priceNote: "Rented until June 2026 — ask about May",
    status: "rented", tier: "watch",
    source: "balicoconutliving.com",
    sourceUrl: "https://balicoconutliving.com/bali-villa-monthly-rental/Canggu/4950-V005-4542/Villa-Ivana-A15",
    imgUrl: "https://balicoconutliving.com/upload/image/property/_thumb/Psxr0JSPWBm1lfjf3ttq.jpeg",
    tags: [
      { label: "Private pool", type: "good" }, { label: "Housemaid 2x/week", type: "good" },
      { label: "Internet included", type: "good" }, { label: "Fully furnished", type: "good" },
      { label: "Rented until June — ask re: May", type: "warn" },
    ],
    contactName: "Bali Coconut Living",
    whatsapp: "62361847672",
    email: "info@balicoconutliving.com",
  },
  {
    id: "l14",
    title: "Stylish 2BR Designer Villa — Tibubeneng",
    location: "Tibubeneng, Kuta Utara · Code: IPB01438",
    neighborhood: "Tibubeneng",
    beds: 2, baths: 2, hasPool: true,
    priceMin: 40_000_000, priceMax: 40_000_000,
    status: "available", tier: 2,
    source: "balivillarealty.com",
    sourceUrl: "https://balivillarealty.com/property/the-ultimate-monthly-escape-stylish-2-br-designer-villa-in-tibubeneng-for-sale-leasehold/",
    imgUrl: "https://balivillarealty.com/wp-content/uploads/2026/02/IPB01438-12.webp",
    tags: [
      { label: "Built 2025 — brand new", type: "good" }, { label: "Waterfall pool + daybeds", type: "good" },
      { label: "Housekeeping included", type: "good" }, { label: "24/7 security", type: "good" },
      { label: "Water included", type: "good" }, { label: "250sqm land", type: "good" },
      { label: "Cat policy: ask", type: "warn" },
    ],
    contactName: "ILOT Property Bali",
    whatsapp: "628113899984",
    email: "office@ilotpropertybali.com",
  },
  {
    id: "l15",
    title: "2BR Geometric Oasis — Tibubeneng, Canggu",
    location: "Tibubeneng, Kuta Utara · Code: IPB01340",
    neighborhood: "Tibubeneng",
    beds: 2, baths: 2, hasPool: true,
    priceMin: 40_000_000, priceMax: 40_000_000,
    status: "available", tier: 2,
    source: "balivillarealty.com",
    sourceUrl: "https://balivillarealty.com/property/the-geometric-oasis-modern-tropical-living-in-the-heart-of-canggu-for-monthly-rental/",
    imgUrl: "https://balivillarealty.com/wp-content/uploads/2025/12/IPB01340-5.webp",
    tags: [
      { label: "Designer geometric pool", type: "good" }, { label: "Dual king suites", type: "good" },
      { label: "Timber sun deck", type: "good" }, { label: "200sqm land", type: "good" },
      { label: "Monthly available", type: "good" }, { label: "Cat policy: ask", type: "warn" },
    ],
    contactName: "ILOT Property Bali",
    whatsapp: "6287766045736",
    email: "office@ilotpropertybali.com",
  },
  {
    id: "l16",
    title: "2BR Villa — Babakan, Canggu (RF2126)",
    location: "Babakan, Canggu · Code: RF2126",
    neighborhood: "Babakan",
    beds: 2, baths: 2, hasPool: false,
    priceMin: 40_000_000, priceMax: 40_000_000,
    priceNote: "Available from April 5, 2026",
    status: "available", tier: 2,
    source: "bali-home-immo.com",
    sourceUrl: "https://bali-home-immo.com/realestate-property/for-rent/villa/monthly/canggu/2-bedroom-villa-for-sale-and-rent-in-bali-canggu-babakan-rf2126",
    imgUrl: "https://bali-home-immo.com/images/properties/2-bedroom-villa-for-sale-and-rent-in-bali-canggu-babakan-rf2126-e56fa6adf32efc7e9061a99848fe8fd8.jpg",
    tags: [
      { label: "Available April 2026", type: "good" }, { label: "3 units in complex", type: "good" },
      { label: "Confirm pool", type: "warn" }, { label: "Cat policy: ask", type: "warn" },
    ],
    contactName: "Bali Home Immo",
    whatsapp: "6282194359401",
    email: "info@bali-home-immo.com",
  },
  {
    id: "l17",
    title: "3BR Villa — Heart of Berawa (CA1534Y)",
    location: "Berawa, Canggu · 2 min to Milk & Madu",
    neighborhood: "Berawa",
    beds: 3, baths: 3, hasPool: true,
    priceMin: 25_000_000, priceMax: 25_000_000,
    priceNote: "Estimate from yearly rate — verify monthly",
    status: "available", tier: 1,
    source: "balilongtermrentals.com",
    sourceUrl: "https://www.balilongtermrentals.com/monthly-rental-villa-in-the-heart-of-berawa/",
    imgUrl: "https://www.balilongtermrentals.com/wp-content/uploads/2024/12/1.jpeg",
    tags: [
      { label: "Available now", type: "good" }, { label: "Private pool", type: "good" },
      { label: "AC + WiFi", type: "good" }, { label: "Bathtub", type: "good" },
      { label: "300sqm land, 2 levels", type: "good" }, { label: "Verify monthly rate", type: "warn" },
      { label: "Cat policy: ask", type: "warn" },
    ],
    contactName: "Bali Long Term Rentals",
    whatsapp: "628113960868",
    email: "info@balilongtermrentals.com",
  },
  {
    id: "l18",
    title: "2BR Villa with Gym & Sauna — Pererenan",
    location: "Pererenan · Available May 2, 2026",
    neighborhood: "Pererenan",
    beds: 2, baths: 2, hasPool: false,
    priceMin: 40_000_000, priceMax: 40_000_000,
    priceNote: "Available May 2, 2026 — right on time",
    status: "confirm", tier: 2,
    highlight: true,
    source: "balivillahub.com",
    sourceUrl: "https://www.balivillahub.com/en",
    imgUrl: "",
    tags: [
      { label: "In Pererenan ✓", type: "good" }, { label: "Private gym", type: "good" },
      { label: "Sauna", type: "good" }, { label: "Available May 2", type: "good" },
      { label: "Cat policy: ask", type: "warn" }, { label: "Confirm pool", type: "warn" },
    ],
    contactName: "Niscala Bali Property",
    email: "hello@niscalabaliproperty.com",
  },
  {
    id: "l19",
    title: "Villa Lin — Canggu",
    location: "Canggu · Brand new modern",
    neighborhood: "Canggu",
    beds: 2, baths: 2, hasPool: false,
    priceMin: 37_000_000, priceMax: 37_000_000,
    priceNote: "Available now (from March 31, 2026)",
    status: "available", tier: 2,
    source: "balivillahub.com",
    sourceUrl: "https://www.balivillahub.com/en",
    imgUrl: "",
    tags: [
      { label: "Brand new", type: "good" }, { label: "Available now", type: "good" },
      { label: "Confirm pool", type: "warn" }, { label: "Cat policy: ask", type: "warn" },
    ],
    contactName: "Direct owner via BaliVillaHub",
  },
  {
    id: "l20",
    title: "2BR Villa — Pererenan (RF52)",
    location: "Pererenan",
    neighborhood: "Pererenan",
    beds: 2, baths: 2, hasPool: false,
    priceMin: 20_000_000, priceMax: 20_000_000,
    priceNote: "Estimated from yearly price — verify monthly rate directly",
    status: "confirm", tier: 1,
    source: "bali-home-immo.com",
    sourceUrl: "https://bali-home-immo.com/realestate-property/for-rent/villa/yearly/pererenan/2-bedroom-villa-for-monthly-yearly-rental-in-pererenan-rf52",
    imgUrl: "",
    tags: [
      { label: "In Pererenan ✓", type: "good" }, { label: "Monthly listed in title", type: "good" },
      { label: "Very low price — verify", type: "warn" }, { label: "Confirm pool", type: "warn" },
      { label: "Cat policy: ask", type: "warn" },
    ],
    contactName: "Bali Home Immo",
    whatsapp: "6282194359401",
    email: "info@bali-home-immo.com",
  },
  {
    id: "l21",
    title: "Brand New 3BR Villa — Berawa (PP Bali)",
    location: "Berawa, Canggu · Code: RT-152",
    neighborhood: "Berawa",
    beds: 3, baths: 4, hasPool: true,
    priceMin: 50_000_000, priceMax: 50_000_000,
    status: "confirm", tier: 3,
    source: "ppbali.com",
    sourceUrl: "https://ppbali.com/property/brand-new-villa-available-yearly-monthly-rentals/",
    imgUrl: "https://ppbali.com/wp-content/uploads/2024/03/RT-152-1-360x240.jpg",
    tags: [
      { label: "Built 2023", type: "good" }, { label: "2m×8m pool", type: "good" },
      { label: "Maid 3x/week", type: "good" }, { label: "Closed garage", type: "good" },
      { label: "Over budget", type: "warn" }, { label: "Cat policy: ask", type: "warn" },
    ],
    contactName: "PP Bali / Agent Mimi",
    whatsapp: "6287860028391",
    email: "info@ppbali.com",
  },
  {
    id: "l22",
    title: "Stylish 3BR Villa — Padang Linjong, Batu Bolong",
    location: "Padang Linjong, Batu Bolong, Canggu",
    neighborhood: "Canggu",
    beds: 3, baths: 4, hasPool: true,
    priceMin: 56_000_000, priceMax: 56_000_000,
    status: "confirm", tier: 3,
    source: "ppbali.com",
    sourceUrl: "https://ppbali.com/property/for-yearly-rent-stylish-3-bedroom-villa-in-padang-linjong/",
    imgUrl: "https://ppbali.com/wp-content/uploads/2025/11/RT-257-11.jpg",
    tags: [
      { label: "300sqm land", type: "good" }, { label: "7×3m pool", type: "good" },
      { label: "All en-suite", type: "good" }, { label: "Fully furnished", type: "good" },
      { label: "Over budget", type: "warn" }, { label: "Cat policy: ask", type: "warn" },
    ],
    contactName: "PP Bali / Agent Mimi",
    whatsapp: "6287860028391",
    email: "info@ppbali.com",
  },
  {
    id: "l23",
    title: "3BR Villa Monthly — Pererenan (CA1619Y)",
    location: "Pererenan · 5 min to Pererenan Beach",
    neighborhood: "Pererenan",
    beds: 3, baths: 3, hasPool: true,
    priceMin: 54_000_000, priceMax: 54_000_000,
    status: "available", tier: 3,
    source: "balilongtermrentals.com",
    sourceUrl: "https://www.balilongtermrentals.com/3-bedrooms-villa-for-monthly-in-pererenan/",
    imgUrl: "https://www.balilongtermrentals.com/wp-content/uploads/2025/06/3-bedrooms-villa-for-monthly-in-Pererenan-15.jpg",
    tags: [
      { label: "In Pererenan ✓", type: "good" }, { label: "Housekeeping 5x/week", type: "good" },
      { label: "Sunken lounge", type: "good" }, { label: "Office workspace", type: "good" },
      { label: "Fast internet", type: "good" }, { label: "Available now", type: "good" },
      { label: "Over budget", type: "warn" },
    ],
    contactName: "Bali Long Term Rentals",
    whatsapp: "628113960868",
    email: "info@balilongtermrentals.com",
  },
  {
    id: "l24",
    title: "3BR Beautiful Villa Monthly — Pererenan (RF9147)",
    location: "Pererenan",
    neighborhood: "Pererenan",
    beds: 3, baths: 3, hasPool: false,
    priceMin: 48_000_000, priceMax: 50_000_000,
    priceNote: "All-inclusive (electricity + internet + cleaning + security)",
    status: "confirm", tier: 3,
    source: "bali-home-immo.com",
    sourceUrl: "https://bali-home-immo.com/realestate-property/for-rent/villa/monthly/pererenan/beautiful-3-bedrooms-villa-for-monthly-rental-in-bali-pererenan-rf9147",
    imgUrl: "https://bali-home-immo.com/images/properties/beautiful-3-bedrooms-villa-for-monthly-rental-in-bali-pererenan-rf9147-b655ffd979f1a171fdb1d7790372fa30.jpg",
    tags: [
      { label: "In Pererenan ✓", type: "good" }, { label: "All-inclusive price", type: "good" },
      { label: "Electricity included", type: "good" }, { label: "Cleaning + security", type: "good" },
      { label: "Confirm pool", type: "warn" }, { label: "Over budget", type: "warn" },
    ],
    contactName: "Bali Home Immo",
    whatsapp: "6282194359401",
    email: "info@bali-home-immo.com",
  },
  {
    id: "l25",
    title: "Azani Villa — Padonan, Tibubeneng",
    location: "Jalan Tratasan Pura Dalem, Tibubeneng · Code: V005-6020",
    neighborhood: "Tibubeneng",
    beds: 3, baths: 3, hasPool: true,
    priceMin: 45_000_000, priceMax: 45_000_000,
    status: "available", tier: 3,
    source: "balicoconutliving.com",
    sourceUrl: "https://balicoconutliving.com/bali-villa-monthly-rental/Canggu/6503-V005-6020/Azani-Villa",
    imgUrl: "https://balicoconutliving.com/upload/image/property/_thumb/Gk5DHzsZT6ZWdvxSiFmc.jpeg",
    tags: [
      { label: "Modern 3-floor tropical", type: "good" }, { label: "Weekly housemaid + gardener", type: "good" },
      { label: "AC + WiFi + TV", type: "good" }, { label: "182sqm building", type: "good" },
      { label: "Over budget", type: "warn" }, { label: "Cat policy: ask", type: "warn" },
    ],
    contactName: "Bali Coconut Living",
    whatsapp: "62361847672",
    email: "info@balicoconutliving.com",
  },
  {
    id: "l26",
    title: "Sunshine Villa — Canggu",
    location: "Canggu",
    neighborhood: "Canggu",
    beds: 3, baths: 3, hasPool: true,
    priceMin: 55_000_000, priceMax: 55_000_000,
    status: "confirm", tier: 3,
    source: "rentroombali.com",
    sourceUrl: "https://rentroombali.com/property/sunshine-villa-canggu/",
    imgUrl: "https://rentroombali.com/wp-content/uploads/2026/01/sunshine-2-studio-canggu-1-1.jpg",
    tags: [
      { label: "180sqm", type: "good" }, { label: "Private pool", type: "good" },
      { label: "Electricity + WiFi included", type: "good" }, { label: "Fully furnished", type: "good" },
      { label: "Over budget", type: "warn" }, { label: "Cat policy: ask", type: "warn" },
    ],
    contactName: "RentRoomBali",
    whatsapp: "6285857155930",
    email: "info@rentroombali.com",
  },
  {
    id: "l27",
    title: "2BR Modern Villa — Heart of Berawa (CA1555Y)",
    location: "Berawa, Canggu · 5-min walk to beach",
    neighborhood: "Berawa",
    beds: 2, baths: 3, hasPool: true,
    priceMin: 65_000_000, priceMax: 65_000_000,
    status: "confirm", tier: 3,
    source: "balilongtermrentals.com",
    sourceUrl: "https://www.balilongtermrentals.com/modern-2-bedroom-villa-in-the-heart-of-berawa/",
    imgUrl: "https://www.balilongtermrentals.com/wp-content/uploads/2025/02/Modern-2-Bedroom-Villa-in-the-Heart-of-Berawa-26-scaled.jpg",
    tags: [
      { label: "Rooftop + hammocks + BBQ", type: "good" }, { label: "Cleaning 3x/week", type: "good" },
      { label: "2 ensuite + guest bath", type: "good" }, { label: "5-min walk to beach", type: "good" },
      { label: "Over budget", type: "warn" }, { label: "Cat policy: ask", type: "warn" },
    ],
    contactName: "Bali Long Term Rentals",
    whatsapp: "628113960868",
    email: "info@balilongtermrentals.com",
  },
];

const SOURCES: Source[] = [
  // Facebook — Pererenan
  { id: "s1", name: "Pererenan housing real-estate selling/rentals/rooms", type: "facebook", url: "https://www.facebook.com/groups/1005176903331488/", area: "Pererenan", city: "Canggu", country: "Indonesia", focus: "Monthly / Long-term", notes: "Only FB group dedicated to Pererenan" },
  // Facebook — Canggu
  { id: "s2", name: "BALI VILLAS RENTAL (CANGGU)", type: "facebook", url: "https://www.facebook.com/groups/214590095236553/", area: "Canggu", city: "Canggu", country: "Indonesia", focus: "All terms", notes: "" },
  { id: "s3", name: "Bali Canggu housing & accommodation", type: "facebook", url: "https://www.facebook.com/groups/1380848555535084/", area: "Canggu", city: "Canggu", country: "Indonesia", focus: "All terms", notes: "" },
  { id: "s4", name: "CaNGGU Housing // Find your villa in Bali", type: "facebook", url: "https://www.facebook.com/groups/1480505465561758/", area: "Canggu", city: "Canggu", country: "Indonesia", focus: "All terms", notes: "" },
  { id: "s5", name: "Canggu Community Housing - Villas & Apartments", type: "facebook", url: "https://www.facebook.com/groups/507714685968940/", area: "Canggu", city: "Canggu", country: "Indonesia", focus: "All terms", notes: "" },
  { id: "s6", name: "Bali Cheap Rentals Canggu, Umalas, Seminyak & Uluwatu", type: "facebook", url: "https://www.facebook.com/groups/1030331340315608/", area: "Canggu / Umalas / Seminyak", city: "Canggu", country: "Indonesia", focus: "Budget", notes: "" },
  { id: "s7", name: "Bali Seminyak & Canggu housing & accommodation", type: "facebook", url: "https://www.facebook.com/groups/430602286977843/", area: "Seminyak / Canggu", city: "Canggu", country: "Indonesia", focus: "All terms", notes: "" },
  // Facebook — Bali-wide
  { id: "s8", name: "Bali MONTHLY Rental Villas", type: "facebook", url: "https://www.facebook.com/groups/balimonthlyvillas/", area: "All Bali", city: "Bali", country: "Indonesia", focus: "Monthly", notes: "Explicitly month-to-month focused" },
  { id: "s9", name: "BALI VILLA LONG TERM Yearly/Monthly Rentals Housing", type: "facebook", url: "https://www.facebook.com/groups/balivillasbest/", area: "All Bali", city: "Bali", country: "Indonesia", focus: "Monthly / Long-term", notes: "" },
  { id: "s10", name: "BALI LONG TERM Yearly/Monthly Rentals", type: "facebook", url: "https://www.facebook.com/groups/balirealestate/", area: "All Bali", city: "Bali", country: "Indonesia", focus: "Monthly / Long-term", notes: "One of the largest and most active" },
  { id: "s11", name: "Bali Long Term Villa Rentals", type: "facebook", url: "https://www.facebook.com/groups/350448261731413/", area: "All Bali", city: "Bali", country: "Indonesia", focus: "Long-term", notes: "" },
  { id: "s12", name: "Bali Housing and Accommodation", type: "facebook", url: "https://www.facebook.com/groups/231171780241689/", area: "All Bali", city: "Bali", country: "Indonesia", focus: "All terms", notes: "" },
  { id: "s13", name: "BALI RENTAL ROOMS & VILLAS", type: "facebook", url: "https://www.facebook.com/groups/460364820648524/", area: "All Bali", city: "Bali", country: "Indonesia", focus: "All terms", notes: "" },
  { id: "s14", name: "BALI CHEAP HOUSE & ROOM RENTAL", type: "facebook", url: "https://www.facebook.com/groups/584717588720490/", area: "All Bali", city: "Bali", country: "Indonesia", focus: "Budget", notes: "" },
  // Websites
  { id: "s15", name: "Bali Home Immo — Pererenan Monthly", type: "website", url: "https://bali-home-immo.com/realestate-property/for-rent/villa/monthly/pererenan", area: "Pererenan", city: "Canggu", country: "Indonesia", focus: "Monthly", notes: "Best dedicated filter for Pererenan monthly" },
  { id: "s16", name: "Bali Home Immo — Canggu Monthly", type: "website", url: "https://bali-home-immo.com/realestate-property/for-rent/villa/monthly/canggu", area: "Canggu", city: "Canggu", country: "Indonesia", focus: "Monthly", notes: "" },
  { id: "s17", name: "Bali Villa Hub", type: "website", url: "https://www.balivillahub.com/en", area: "All Bali", city: "Bali", country: "Indonesia", focus: "Monthly / Long-term", notes: "Best aggregator — direct owner contact" },
  { id: "s18", name: "Bali Long Term Rentals — Canggu", type: "website", url: "https://www.balilongtermrentals.com/category/canggu/", area: "Canggu", city: "Canggu", country: "Indonesia", focus: "Long-term / Monthly", notes: "Large inventory, WhatsApp contact" },
  { id: "s19", name: "Bali Coconut Living", type: "website", url: "https://balicoconutliving.com/property/villa-for-monthly-rental", area: "All Bali", city: "Bali", country: "Indonesia", focus: "Monthly", notes: "Boutique agency" },
  { id: "s20", name: "Bali Villa Realty — Canggu", type: "website", url: "https://balivillarealty.com/canggu-villas-for-rent/", area: "Canggu", city: "Canggu", country: "Indonesia", focus: "Monthly / Yearly", notes: "" },
  { id: "s21", name: "Pure Land Bali — Canggu Long-term", type: "website", url: "https://purelandbali.com/long-term/canggu/", area: "Canggu", city: "Canggu", country: "Indonesia", focus: "Long-term", notes: "" },
  { id: "s22", name: "RentRoomBali — Canggu", type: "website", url: "https://rentroombali.com/property-location/canggu/", area: "Canggu", city: "Canggu", country: "Indonesia", focus: "Monthly", notes: "Inspected + photographed properties" },
  { id: "s23", name: "Rumah123 — Canggu Rentals", type: "website", url: "https://www.rumah123.com/en/rent/badung/canggu/house/", area: "Canggu", city: "Canggu", country: "Indonesia", focus: "All terms", notes: "Local Indonesian portal, good inventory" },
  { id: "s24", name: "Bali Treasure Properties — Monthly", type: "website", url: "https://www.balitreasureproperties.com/bali-villa-rentals/monthly-rentals", area: "All Bali", city: "Bali", country: "Indonesia", focus: "Monthly", notes: "" },
  { id: "s25", name: "ILOT Property Bali", type: "website", url: "https://ilotpropertybali.com", area: "All Bali", city: "Bali", country: "Indonesia", focus: "All terms", notes: "WhatsApp: +62 823-2288-8090" },
  // Telegram
  { id: "s26", name: "Bali Villas for Rent", type: "telegram", url: "https://t.me/s/bestbalivillas", area: "All Bali", city: "Bali", country: "Indonesia", focus: "Monthly / Discounted", notes: "Active channel, posts monthly pricing up to 30% off" },
];

const STATUS_LABELS: Record<string, string> = {
  "not-contacted": "🔲 Not contacted",
  "contacted": "📞 Contacted",
  "maybe": "🤔 Maybe",
  "viewing": "👀 Viewing scheduled",
  "viewed": "✅ Viewed",
  "rejected": "❌ Rejected",
  "top-pick": "🏆 Top pick",
};

const TIER_LABEL: Record<string | number, string> = {
  1: "Under 35M",
  2: "35–42M",
  3: "Over Budget",
  "watch": "Watch List",
};

function formatPrice(n: number) {
  return `${(n / 1_000_000).toFixed(0)}M`;
}

function StatusBadge({ status }: { status: Listing["status"] }) {
  const styles = {
    available: "bg-dark-success/15 text-dark-success",
    confirm: "bg-dark-warn/15 text-dark-warn",
    rented: "bg-dark-danger/15 text-dark-danger",
  };
  const labels = { available: "Available", confirm: "Needs Confirmation", rented: "Rented Out" };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function TierBadge({ tier }: { tier: Listing["tier"] }) {
  const styles = {
    1: "bg-dark-success/15 text-dark-success",
    2: "bg-dark-warn/15 text-dark-warn",
    3: "bg-dark-danger/15 text-dark-danger",
    "watch": "bg-dark-muted/20 text-dark-muted",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[tier]}`}>
      {TIER_LABEL[tier]}
    </span>
  );
}

function TypeBadge({ type }: { type: Source["type"] }) {
  const styles = {
    facebook: "bg-cm-purple/15 text-cm-purple",
    website: "bg-dark-success/15 text-dark-success",
    telegram: "bg-dark-warn/15 text-dark-warn",
  };
  const labels = { facebook: "Facebook", website: "Website", telegram: "Telegram" };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[type]}`}>
      {labels[type]}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export default function HousingSearchPage() {
  const [tab, setTab] = useState<"listings" | "sources">("listings");
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [filterTier, setFilterTier] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterNeighborhood, setFilterNeighborhood] = useState<string>("all");
  const [filterTracking, setFilterTracking] = useState<string>("not-rejected");
  const [sourceSearch, setSourceSearch] = useState("");
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>("all");
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const s = localStorage.getItem("housing_status");
      const n = localStorage.getItem("housing_notes");
      if (s) setStatusMap(JSON.parse(s));
      if (n) setNotesMap(JSON.parse(n));
    } catch { /* ignore */ }
  }, []);

  const setStatus = (id: string, val: string) => {
    const next = { ...statusMap, [id]: val };
    setStatusMap(next);
    localStorage.setItem("housing_status", JSON.stringify(next));
  };

  const setNote = (id: string, val: string) => {
    const next = { ...notesMap, [id]: val };
    setNotesMap(next);
    localStorage.setItem("housing_notes", JSON.stringify(next));
  };

  const toggleNotes = (id: string) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredListings = LISTINGS.filter(l => {
    if (filterTier !== "all" && String(l.tier) !== filterTier) return false;
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterNeighborhood !== "all" && l.neighborhood !== filterNeighborhood) return false;
    const tracking = statusMap[l.id] || "not-contacted";
    if (filterTracking === "not-rejected" && tracking === "rejected") return false;
    if (filterTracking !== "all" && filterTracking !== "not-rejected" && tracking !== filterTracking) return false;
    return true;
  });

  const filteredSources = SOURCES.filter(s => {
    if (sourceTypeFilter !== "all" && s.type !== sourceTypeFilter) return false;
    if (sourceSearch) {
      const q = sourceSearch.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.area.toLowerCase().includes(q) || s.notes.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="bg-cm-purple/15 rounded-lg p-3">
            <Home className="text-cm-purple" size={24} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-dark-text">Housing Search DB</h1>
            <p className="text-dark-muted mt-1">Pererenan / Canggu, Bali · 2BR · ~30M IDR/mo · Move-in May 7–8 · Cat-friendly · Near RITE Gym or Omni</p>
          </div>
          <div className="flex gap-3 text-sm">
            <div className="bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-center">
              <div className="text-dark-text font-bold text-lg">{filteredListings.length}<span className="text-dark-muted text-sm">/{LISTINGS.length}</span></div>
              <div className="text-dark-muted text-xs">Listings</div>
            </div>
            <div className="bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-center">
              <div className="text-dark-success font-bold text-lg">{LISTINGS.filter(l => l.status === "available").length}</div>
              <div className="text-dark-muted text-xs">Available</div>
            </div>
            <div className="bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-center">
              <div className="text-dark-text font-bold text-lg">{SOURCES.length}</div>
              <div className="text-dark-muted text-xs">Sources</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-panel2 rounded-xl p-1 w-fit">
        {([["listings", "Listings"], ["sources", "Search Sources"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? "bg-dark-panel text-dark-text shadow-sm" : "text-dark-muted hover:text-dark-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── LISTINGS TAB ── */}
      {tab === "listings" && (
        <>
          {/* Filters */}
          <div className="flex gap-3 flex-wrap items-center">
            <Filter size={14} className="text-dark-muted" />
            <select
              value={filterTier}
              onChange={e => setFilterTier(e.target.value)}
              className="bg-dark-panel2 border border-dark-border text-dark-text text-sm rounded-lg px-3 py-1.5"
            >
              <option value="all">All Tiers</option>
              <option value="1">Tier 1 (Under 35M)</option>
              <option value="2">Tier 2 (35–42M)</option>
              <option value="3">Over Budget (42M+)</option>
              <option value="watch">Watch List</option>
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-dark-panel2 border border-dark-border text-dark-text text-sm rounded-lg px-3 py-1.5"
            >
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="confirm">Needs Confirmation</option>
              <option value="rented">Rented Out</option>
            </select>
            <select
              value={filterNeighborhood}
              onChange={e => setFilterNeighborhood(e.target.value)}
              className="bg-dark-panel2 border border-dark-border text-dark-text text-sm rounded-lg px-3 py-1.5"
            >
              <option value="all">All Neighborhoods</option>
              <option value="Pererenan">Pererenan</option>
              <option value="Canggu">Canggu</option>
              <option value="North Canggu">North Canggu</option>
              <option value="Tibubeneng">Tibubeneng</option>
              <option value="Berawa">Berawa</option>
              <option value="Babakan">Babakan</option>
            </select>
            <select
              value={filterTracking}
              onChange={e => setFilterTracking(e.target.value)}
              className="bg-dark-panel2 border border-dark-border text-dark-text text-sm rounded-lg px-3 py-1.5"
            >
              <option value="not-rejected">Hide Rejected</option>
              <option value="all">All</option>
              <option value="not-contacted">🔲 Not contacted</option>
              <option value="contacted">📞 Contacted</option>
              <option value="maybe">🤔 Maybe</option>
              <option value="viewing">👀 Viewing scheduled</option>
              <option value="viewed">✅ Viewed</option>
              <option value="rejected">❌ Rejected</option>
              <option value="top-pick">🏆 Top pick</option>
            </select>
            <span className="text-dark-muted text-sm ml-auto">{filteredListings.length} listings</span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredListings.map(l => (
              <div
                key={l.id}
                className={`bg-dark-panel border rounded-xl overflow-hidden ${l.highlight ? "border-cm-purple" : "border-dark-border"}`}
              >
                {/* Image */}
                <div className="relative h-48 bg-dark-panel2 overflow-hidden">
                  {l.imgUrl ? (
                    <img src={l.imgUrl} alt={l.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-dark-muted text-sm flex-col gap-2">
                      <Home size={28} className="text-dark-muted" />
                      <span>Photo on listing →</span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <TierBadge tier={l.tier} />
                  </div>
                  <div className="absolute top-2 right-2">
                    <StatusBadge status={l.status} />
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-dark-text font-bold text-sm leading-tight">{l.title}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin size={11} className="text-dark-muted" />
                      <span className="text-dark-muted text-xs">{l.location}</span>
                    </div>
                  </div>

                  {/* Price + meta */}
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-dark-text font-black text-xl">
                        {l.priceMin === l.priceMax
                          ? `${formatPrice(l.priceMin)}M`
                          : `${formatPrice(l.priceMin)}–${formatPrice(l.priceMax)}M`}
                      </span>
                      <span className="text-dark-muted text-xs ml-1">IDR/mo</span>
                      {l.priceNote && <div className="text-dark-muted text-xs mt-0.5">{l.priceNote}</div>}
                    </div>
                    <div className="flex gap-2 text-xs text-dark-muted">
                      <span className="bg-dark-panel2 border border-dark-border rounded px-2 py-0.5">🛏 {l.beds}BR</span>
                      <span className="bg-dark-panel2 border border-dark-border rounded px-2 py-0.5">🚿 {l.baths}BA</span>
                      {l.hasPool && <span className="bg-dark-panel2 border border-dark-border rounded px-2 py-0.5">🏊 Pool</span>}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {l.tags.map((tag, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2 py-0.5 rounded-full border ${
                          tag.type === "good"
                            ? "bg-dark-success/10 text-dark-success border-dark-success/20"
                            : tag.type === "warn"
                            ? "bg-dark-warn/10 text-dark-warn border-dark-warn/20"
                            : "bg-dark-panel2 text-dark-muted border-dark-border"
                        }`}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>

                  {/* Source */}
                  <div className="flex items-center gap-1.5 text-xs text-dark-muted">
                    <Globe size={11} />
                    <span>Source:</span>
                    <a href={l.sourceUrl} target="_blank" rel="noreferrer" className="text-cm-purple hover:underline flex items-center gap-0.5">
                      {l.source} <ExternalLink size={10} />
                    </a>
                  </div>

                  {/* Contact */}
                  <div className="bg-dark-panel2 border border-dark-border rounded-lg p-3 space-y-2">
                    <div className="text-xs font-semibold text-dark-muted uppercase tracking-wide">Contact</div>
                    <div className="text-sm text-dark-text font-medium">{l.contactName}</div>
                    <div className="flex flex-wrap gap-2">
                      {l.whatsapp && (
                        <a
                          href={`https://wa.me/${l.whatsapp}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs bg-dark-success/15 text-dark-success px-3 py-1.5 rounded-lg font-medium hover:bg-dark-success/25 transition-colors"
                        >
                          <MessageCircle size={12} /> WhatsApp
                        </a>
                      )}
                      {l.email && (
                        <a
                          href={`mailto:${l.email}`}
                          className="flex items-center gap-1.5 text-xs bg-cm-purple/15 text-cm-purple px-3 py-1.5 rounded-lg font-medium hover:bg-cm-purple/25 transition-colors"
                        >
                          <Mail size={12} /> Email
                        </a>
                      )}
                      <a
                        href={l.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs bg-dark-panel border border-dark-border text-dark-text px-3 py-1.5 rounded-lg font-medium hover:border-cm-purple transition-colors"
                      >
                        <ExternalLink size={12} /> View Listing
                      </a>
                    </div>
                  </div>

                  {/* Status + Notes */}
                  <div className="flex gap-2 items-center">
                    <select
                      value={statusMap[l.id] || "not-contacted"}
                      onChange={e => setStatus(l.id, e.target.value)}
                      className="flex-1 bg-dark-panel2 border border-dark-border text-dark-text text-xs rounded-lg px-2 py-1.5"
                    >
                      {Object.entries(STATUS_LABELS).map(([v, label]) => (
                        <option key={v} value={v}>{label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => toggleNotes(l.id)}
                      className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg border transition-colors ${
                        expandedNotes.has(l.id)
                          ? "bg-cm-purple/15 border-cm-purple text-cm-purple"
                          : "bg-dark-panel2 border-dark-border text-dark-muted hover:text-dark-text"
                      }`}
                    >
                      <StickyNote size={12} />
                      {notesMap[l.id] ? <Check size={10} className="text-dark-success" /> : null}
                    </button>
                  </div>
                  {expandedNotes.has(l.id) && (
                    <textarea
                      placeholder="Add notes..."
                      value={notesMap[l.id] || ""}
                      onChange={e => setNote(l.id, e.target.value)}
                      className="w-full bg-dark-panel2 border border-dark-border text-dark-text text-xs rounded-lg px-3 py-2 resize-y min-h-16 placeholder:text-dark-muted"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── SOURCES TAB ── */}
      {tab === "sources" && (
        <>
          <div className="bg-dark-panel border border-dark-border rounded-xl p-4 text-sm text-dark-muted">
            All channels used in this search. Reusable — filter by city or type to use for any Bali location.
          </div>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap items-center">
            <Search size={14} className="text-dark-muted" />
            <input
              type="text"
              placeholder="Search sources..."
              value={sourceSearch}
              onChange={e => setSourceSearch(e.target.value)}
              className="bg-dark-panel2 border border-dark-border text-dark-text text-sm rounded-lg px-3 py-1.5 w-56 placeholder:text-dark-muted"
            />
            <select
              value={sourceTypeFilter}
              onChange={e => setSourceTypeFilter(e.target.value)}
              className="bg-dark-panel2 border border-dark-border text-dark-text text-sm rounded-lg px-3 py-1.5"
            >
              <option value="all">All Types</option>
              <option value="facebook">Facebook Groups</option>
              <option value="website">Websites</option>
              <option value="telegram">Telegram</option>
            </select>
            <span className="text-dark-muted text-sm ml-auto">{filteredSources.length} sources</span>
          </div>

          {/* Sources Table */}
          <div className="bg-dark-panel border border-dark-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-border bg-dark-panel2">
                    <th className="text-left px-4 py-3 text-dark-muted text-xs font-semibold uppercase tracking-wide">Type</th>
                    <th className="text-left px-4 py-3 text-dark-muted text-xs font-semibold uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 text-dark-muted text-xs font-semibold uppercase tracking-wide">Area</th>
                    <th className="text-left px-4 py-3 text-dark-muted text-xs font-semibold uppercase tracking-wide">Focus</th>
                    <th className="text-left px-4 py-3 text-dark-muted text-xs font-semibold uppercase tracking-wide">Notes</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {filteredSources.map(s => (
                    <tr key={s.id} className="hover:bg-dark-panel2 transition-colors">
                      <td className="px-4 py-3">
                        <TypeBadge type={s.type} />
                      </td>
                      <td className="px-4 py-3 text-dark-text font-medium max-w-xs">
                        <span className="line-clamp-2">{s.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-dark-muted text-xs">
                          <MapPin size={11} />
                          {s.area}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-dark-panel2 border border-dark-border text-dark-muted text-xs px-2 py-0.5 rounded-full">
                          {s.focus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-dark-muted text-xs max-w-xs">
                        {s.notes || <span className="opacity-30">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-cm-purple text-xs hover:underline whitespace-nowrap"
                        >
                          Open <ExternalLink size={10} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
