export interface Property {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  listing_type: 'sale' | 'rent';
  category_id: string | null;
  location_id: string | null;
  address: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  images: string[];
  features: string[];
  is_featured: boolean;
  is_new_project: boolean;
  status: 'active' | 'pending' | 'sold' | 'rented';
  user_id: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
  category?: PropertyCategory;
  location?: Location;
}

export interface PropertyCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  parent_id: string | null;
  created_at: string;
}

export interface Location {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  created_at: string;
}

export interface Agent {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  logo: string | null;
  description: string | null;
  is_verified: boolean;
  created_at: string;
}

export interface Inquiry {
  id: string;
  property_id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  property_id: string | null;
  phone_number: string;
  amount: number;
  merchant_request_id: string | null;
  checkout_request_id: string | null;
  mpesa_receipt_number: string | null;
  transaction_date: string | null;
  status: string;
  result_code: number | null;
  result_desc: string | null;
  created_at: string;
  updated_at: string;
}

export interface SearchFilters {
  listingType: 'sale' | 'rent' | 'all';
  category: string;
  location: string;
  minPrice: number | null;
  maxPrice: number | null;
  bedrooms: number | null;
}
