export interface Product {
  id: string;
  name: string;
  category: 'store' | 'farm' | 'stay';
  price: number;
  description: string;
  imageUrl: string;
  unit?: string;
}

export interface Booking {
  id: string;
  userId: string;
  category: 'store' | 'farm' | 'stay';
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }[];
  totalPrice: number;
  date: string;
  time?: string;
  userName: string;
  phone: string;
  address?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'shipped';
  createdAt: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
}
