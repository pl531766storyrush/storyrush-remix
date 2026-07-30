/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Category {
  ROMANCE = 'Romance',
  ACTION = 'Action',
  HORROR = 'Horror',
  COMEDY = 'Comedy',
  THRILLER = 'Thriller'
}

export interface DramaCategory {
  id: string;
  name: string;
  icon: string;
  desc: string;
  createdAt: string;
}

export interface Series {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnailUrl: string;
  creator: string;
  tags: string[];
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'user' | 'admin';
  isPremium: boolean;
  premiumExpiresAt?: string;
  subscriptionPlan?: 'weekly' | 'monthly' | 'yearly';
  purchaseDate?: string;
  expiryDate?: string;
  createdAt: string;
}

export interface Drama {
  id: string;
  title: string;
  description: string;
  category: Category | string;
  thumbnailUrl: string;
  videoUrl: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  creator: string;
  duration: number; // in seconds
  episodeNumber: number;
  seriesName: string;
  tags: string[];
  createdAt: string;
  timestamp?: string;
  isTrending?: boolean;
  isFeatured?: boolean;
  isPremium?: boolean;
  seriesId?: string;
}

export interface Comment {
  id: string;
  dramaId: string;
  videoId?: string;
  userId: string;
  userName: string;
  userPhoto: string;
  text: string;
  createdAt: string;
  parentId?: string;
  likes?: string[];
}

export interface WatchHistory {
  id: string; // userId_dramaId
  userId: string;
  dramaId: string;
  progress: number; // seconds watched
  duration: number; // total duration in seconds
  updatedAt: string;
}

export interface Favorite {
  id: string; // userId_dramaId
  userId: string;
  dramaId: string;
  createdAt: string;
}

export interface Like {
  id: string; // userId_dramaId
  userId: string;
  dramaId: string;
  createdAt: string;
}

export interface Follow {
  id: string; // followerId_followedId
  followerId: string;
  followedId: string;
  createdAt: string;
}

export function mapDocToDrama(id: string, data: any): Drama {
  if (!data) {
    return {
      id: id || '',
      title: 'Untitled Drama',
      description: 'No description available.',
      category: Category.ROMANCE,
      thumbnailUrl: '',
      videoUrl: '',
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      creator: '',
      duration: 0,
      episodeNumber: 1,
      seriesName: '',
      tags: [],
      createdAt: new Date().toISOString()
    };
  }

  const title = data.title || data.name || 'Untitled Drama';
  const description = data.description || data.desc || 'No description available.';

  // Map category robustly
  let category: Category | string = Category.ROMANCE;
  const rawCat = data.category || data.genre || data.type;
  if (rawCat) {
    const rawCatStr = String(rawCat).trim();
    const normalized = rawCatStr.toLowerCase();
    
    // Check if it matches an enum value
    let matchedEnum: Category | null = null;
    for (const enumVal of Object.values(Category)) {
      if (enumVal.toLowerCase() === normalized) {
        matchedEnum = enumVal;
        break;
      }
    }

    if (matchedEnum) {
      category = matchedEnum;
    } else if (normalized.includes('romance')) {
      category = Category.ROMANCE;
    } else if (normalized.includes('action')) {
      category = Category.ACTION;
    } else if (normalized.includes('horror')) {
      category = Category.HORROR;
    } else if (normalized.includes('comedy')) {
      category = Category.COMEDY;
    } else if (normalized.includes('thriller')) {
      category = Category.THRILLER;
    } else if (rawCatStr.length > 0) {
      category = rawCatStr;
    }
  }

  const thumbnailUrl = data.thumbnailUrl || data.thumbnail || data.image || data.imageUrl || data.cover || data.coverUrl || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&q=80';
  const videoUrl = data.videoUrl || data.video || data.mediaUrl || data.url || '';

  const likesCount = typeof data.likesCount === 'number' ? data.likesCount : (typeof data.likes === 'number' ? data.likes : (data.likes_count || 0));
  const commentsCount = typeof data.commentsCount === 'number' ? data.commentsCount : (typeof data.comments === 'number' ? data.comments : (data.comments_count || 0));
  const sharesCount = typeof data.sharesCount === 'number' ? data.sharesCount : (typeof data.shares === 'number' ? data.shares : (data.shares_count || 0));

  const creator = data.creator || data.author || data.username || data.creatorName || 'storyrush_creator';
  const duration = typeof data.duration === 'number' ? data.duration : (typeof data.length === 'number' ? data.length : 30);
  
  let episodeNumber = 1;
  const rawEp = data.episodeNumber !== undefined ? data.episodeNumber : (data.episode !== undefined ? data.episode : (data.ep !== undefined ? data.ep : 1));
  if (rawEp !== undefined && rawEp !== null) {
    const parsed = Number(rawEp);
    if (!isNaN(parsed)) {
      episodeNumber = parsed;
    }
  }

  const seriesName = data.seriesName || data.series || data.series_name || data.showName || 'Amazing Series';

  let tags: string[] = [];
  if (Array.isArray(data.tags)) {
    tags = data.tags;
  } else if (typeof data.tags === 'string') {
    tags = data.tags.split(',').map((t: string) => t.trim());
  }

  let createdAt = '';
  const rawCreated = data.createdAt || data.timestamp || data.created_at || data.date;
  if (rawCreated) {
    if (typeof rawCreated === 'string') {
      createdAt = rawCreated;
    } else if (rawCreated && typeof rawCreated.toISOString === 'function') {
      createdAt = rawCreated.toISOString();
    } else if (rawCreated && typeof rawCreated.toDate === 'function') {
      createdAt = rawCreated.toDate().toISOString();
    } else if (rawCreated && rawCreated.seconds !== undefined) {
      createdAt = new Date(rawCreated.seconds * 1000).toISOString();
    } else {
      createdAt = String(rawCreated);
    }
  } else {
    createdAt = new Date().toISOString();
  }

  const isPremiumVal = data.isPremium !== undefined ? data.isPremium : data.premium;
  const isPremium = isPremiumVal === true || isPremiumVal === 'true' || isPremiumVal === 1 || isPremiumVal === '1';

  const seriesId = data.seriesId || data.series_id || undefined;

  return {
    id: id || data.id,
    title,
    description,
    category,
    thumbnailUrl,
    videoUrl,
    likesCount,
    commentsCount,
    sharesCount,
    creator,
    duration,
    episodeNumber,
    seriesName,
    tags,
    createdAt,
    isTrending: !!data.isTrending,
    isFeatured: !!data.isFeatured,
    isPremium,
    seriesId
  };
}

