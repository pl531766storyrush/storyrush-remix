/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView, 
  TextInput, 
  Alert,
  Platform,
  Image,
  Modal
} from 'react-native';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  onSnapshot,
  query,
  where,
  orderBy
} from 'firebase/firestore';
// Firebase Storage has been replaced with Cloudinary for media uploads
import { signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Category, Drama, DramaCategory, Series, mapDocToDrama } from '../types';
import { 
  FolderPlus, 
  Users, 
  Database, 
  X, 
  Trash2, 
  Edit, 
  Plus, 
  Play, 
  Sparkles,
  Check,
  ShieldCheck,
  Layers,
  Clapperboard,
  Heart,
  MessageSquare,
  Share2,
  Lock,
  UploadCloud,
  TrendingUp,
  Award,
  CheckCircle,
  Search,
  Eye,
  EyeOff
} from 'lucide-react-native';
import tw from 'twrnc';

interface AdminPanelProps {
  onClose: () => void;
}

type AdminSubTab = 'dashboard' | 'create' | 'manage' | 'series' | 'categories' | 'users';

export default function AdminPanel({ onClose }: AdminPanelProps) {
  // Secure Login Gate
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Sub Tab
  const [subTab, setSubTab] = useState<AdminSubTab>('dashboard');
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // DB real-time counts
  const [dbLikesCount, setDbLikesCount] = useState(0);
  const [dbCommentsCount, setDbCommentsCount] = useState(0);

  // Original files tracking for edits
  const [originalVideoUrl, setOriginalVideoUrl] = useState<string | null>(null);
  const [originalThumbUrl, setOriginalThumbUrl] = useState<string | null>(null);

  // Dynamic Categories and Series list
  const [categories, setCategories] = useState<DramaCategory[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);

  // Categories management inputs
  const [editingCategory, setEditingCategory] = useState<DramaCategory | null>(null);
  const [catId, setCatId] = useState('');
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Series management inputs
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [seriesIdInput, setSeriesIdInput] = useState('');
  const [seriesTitle, setSeriesTitle] = useState('');
  const [seriesDesc, setSeriesDesc] = useState('');
  const [seriesCategory, setSeriesCategory] = useState('');
  const [seriesThumb, setSeriesThumb] = useState('');
  const [seriesCreator, setSeriesCreator] = useState('');
  const [seriesTags, setSeriesTags] = useState('');

  // Form inputs for new / edited Drama
  const [editingId, setEditingId] = useState<string | null>(null);
  const [seriesName, setSeriesName] = useState('');
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category | string>(Category.ROMANCE);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState('60');
  const [episodeNumber, setEpisodeNumber] = useState('1');
  const [creator, setCreator] = useState('Story Rush Originals');
  const [tagsInput, setTagsInput] = useState('');
  const [isTrending, setIsTrending] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPremiumEp, setIsPremiumEp] = useState(false);

  // Storage upload states
  const [videoUploadProgress, setVideoUploadProgress] = useState<number | null>(null);
  const [thumbUploadProgress, setThumbUploadProgress] = useState<number | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [thumbFileName, setThumbFileName] = useState<string | null>(null);

  // Helper functions for safe environment and storage access
  const getEnvVar = (key: string) => {
    try {
      if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key];
      }
    } catch (e) {}
    return '';
  };

  const getStorageItem = (key: string) => {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch (e) {}
    return null;
  };

  // Cloudinary configuration states (persisted locally or read from env)
  const [cloudinaryCloudName, setCloudinaryCloudName] = useState(() => {
    return getStorageItem('storyrush_cloudinary_cloud_name') || getEnvVar('VITE_CLOUDINARY_CLOUD_NAME') || 'wo9relh3';
  });
  const [cloudinaryUploadPreset, setCloudinaryUploadPreset] = useState(() => {
    return getStorageItem('storyrush_cloudinary_upload_preset') || getEnvVar('VITE_CLOUDINARY_UPLOAD_PRESET') || 'Storyrush_upload';
  });
  const [cloudinaryApiKey, setCloudinaryApiKey] = useState(() => {
    return getStorageItem('storyrush_cloudinary_api_key') || getEnvVar('VITE_CLOUDINARY_API_KEY') || '';
  });
  const [cloudinaryApiSecret, setCloudinaryApiSecret] = useState(() => {
    return getStorageItem('storyrush_cloudinary_api_secret') || getEnvVar('VITE_CLOUDINARY_API_SECRET') || '';
  });
  const [selectedDeleteEpisode, setSelectedDeleteEpisode] = useState<Drama | null>(null);
  const [adminToast, setAdminToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'trending' | 'featured'>('all');

  // Input Refs for Web File Selectors
  const videoInputRef = useRef<any>(null);
  const thumbInputRef = useRef<any>(null);

  // Auto verify if user is already known admin
  useEffect(() => {
    if (auth.currentUser) {
      const email = auth.currentUser.email;
      if (email === 'pl531766@gmail.com') {
        setIsAdminVerified(true);
      }
    }
  }, []);

  // Fetch dramas, users, categories, series
  useEffect(() => {
    if (!isAdminVerified) return;

    // Fetch dramas using robust Firestore sorting on episodeNumber ascending
    const q = query(
      collection(db, 'episodes'),
      orderBy('episodeNumber', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Drama[] = [];
      snapshot.forEach((docSnap) => {
        list.push(mapDocToDrama(docSnap.id, docSnap.data()));
      });
      setDramas(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'episodes');
    });

    // Fetch users list
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data());
      });
      setUsersList(list);
    });

    // Fetch categories list
    const unsubscribeCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const list: DramaCategory[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as DramaCategory);
      });
      list.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(list);
    });

    // Fetch series list
    const unsubscribeSeries = onSnapshot(collection(db, 'series'), (snapshot) => {
      const list: Series[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Series);
      });
      list.sort((a, b) => a.name.localeCompare(b.name));
      setSeriesList(list);
    });

    // Fetch likes count in real time
    const unsubscribeLikes = onSnapshot(collection(db, 'likes'), (snapshot) => {
      setDbLikesCount(snapshot.size);
    });

    // Fetch comments count in real time
    const unsubscribeComments = onSnapshot(collection(db, 'comments'), (snapshot) => {
      setDbCommentsCount(snapshot.size);
    });

    return () => {
      unsubscribe();
      unsubscribeUsers();
      unsubscribeCategories();
      unsubscribeSeries();
      unsubscribeLikes();
      unsubscribeComments();
    };
  }, [isAdminVerified]);

  // Secure Admin Gate Validation
  const handleAdminLogin = async () => {
    setLoginError(null);
    setLoginLoading(true);

    try {
      // 1. Passcode quick check
      const trimmedPasscode = passcode.trim();
      if (trimmedPasscode === '2026-STORYRUSH' || trimmedPasscode === 'ADMIN123' || trimmedPasscode === 'ADMIN_STORY') {
        setIsAdminVerified(true);
        setLoginLoading(false);
        return;
      }

      // 2. Firebase authentication login check
      const trimmedEmail = adminEmail.trim();
      const trimmedPassword = adminPassword;

      if (!trimmedEmail || !trimmedPassword) {
        if (trimmedPasscode.length > 0) {
          throw new Error('Invalid Secure Passcode. Please try again.');
        }
        throw new Error('Please fill in login credentials or enter a secure passcode.');
      }

      await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      setIsAdminVerified(true);
    } catch (err: any) {
      console.error('[Admin Login Error]:', err);
      setLoginError(err?.message || 'Access Denied: Invalid credentials or passcode.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Save Cloudinary Configuration locally
  const handleSaveCloudinaryConfig = () => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('storyrush_cloudinary_cloud_name', cloudinaryCloudName.trim());
        localStorage.setItem('storyrush_cloudinary_upload_preset', cloudinaryUploadPreset.trim());
        localStorage.setItem('storyrush_cloudinary_api_key', cloudinaryApiKey.trim());
        localStorage.setItem('storyrush_cloudinary_api_secret', cloudinaryApiSecret.trim());
      }
    } catch (e) {}
    Alert.alert('Config Saved', 'Cloudinary configuration updated and saved locally!');
  };

  // Helper to extract public ID from Cloudinary URL
  const getCloudinaryPublicId = (url: string): string | null => {
    if (!url || !url.includes('cloudinary.com')) return null;
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    let path = parts[1];
    if (path.startsWith('v')) {
      const nextSlash = path.indexOf('/');
      if (nextSlash !== -1 && /^\d+$/.test(path.substring(1, nextSlash))) {
        path = path.substring(nextSlash + 1);
      }
    }
    const lastDot = path.lastIndexOf('.');
    if (lastDot !== -1) {
      path = path.substring(0, lastDot);
    }
    return path;
  };

  // Helper to generate SHA-1 hash for secure Cloudinary signature
  const sha1 = async (str: string): Promise<string> => {
    const utf8 = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-1', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((bytes) => bytes.toString(16).padStart(2, '0')).join('');
  };

  // Delete asset from Cloudinary securely
  const deleteFromCloudinary = async (publicId: string, resourceType: 'image' | 'video') => {
    const cloudName = cloudinaryCloudName.trim();
    const apiKey = cloudinaryApiKey.trim();
    const apiSecret = cloudinaryApiSecret.trim();

    if (!cloudName) {
      throw new Error('Cloudinary Cloud Name is not configured.');
    }
    if (!apiKey || !apiSecret) {
      throw new Error('Cloudinary API Key or API Secret is not configured. Please fill out the Cloudinary Settings in the "Add Ep" tab to enable media deletion.');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signatureStr = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = await sha1(signatureStr);

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`;
    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('timestamp', String(timestamp));
    formData.append('api_key', apiKey);
    formData.append('signature', signature);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsedError = errorText;
      try {
        const json = JSON.parse(errorText);
        parsedError = json.error?.message || errorText;
      } catch (e) {}
      throw new Error(`Cloudinary delete failed: ${parsedError}`);
    }

    const result = await response.json();
    if (result.result !== 'ok' && result.result !== 'not_found') {
      throw new Error(`Cloudinary returned non-ok result: ${JSON.stringify(result)}`);
    }
  };

  // Cloudinary direct XMLHttpRequest based media uploader with progress
  const uploadToCloudinary = (
    file: File | Blob,
    resourceType: 'image' | 'video',
    onProgress: (progress: number) => void,
    onSuccess: (url: string) => void,
    onError: (error: string) => void
  ) => {
    const cloudName = cloudinaryCloudName.trim();
    const uploadPreset = cloudinaryUploadPreset.trim();

    if (!cloudName || !uploadPreset) {
      onError('Cloudinary Cloud Name or Upload Preset is not configured. Please fill out the setup card in the "Add Ep" tab.');
      return;
    }

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    xhr.open('POST', url, true);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress(pct);
      }
    });

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.secure_url) {
              onSuccess(response.secure_url);
            } else {
              onError('Cloudinary upload succeeded but secure_url was missing from response.');
            }
          } catch (err: any) {
            onError('Failed to parse Cloudinary response: ' + err.message);
          }
        } else {
          try {
            const response = JSON.parse(xhr.responseText);
            onError(response.error?.message || `Upload failed with status ${xhr.status}`);
          } catch (e) {
            onError(`Upload failed with status ${xhr.status}`);
          }
        }
      }
    };

    xhr.onerror = () => {
      onError('Network error occurred during Cloudinary upload.');
    };

    xhr.send(formData);
  };

  // Direct File uploader for Video using Cloudinary
  const handleVideoFileChange = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoFileName(file.name);
    setVideoUploadProgress(0);

    uploadToCloudinary(
      file,
      'video',
      (progress) => {
        setVideoUploadProgress(progress);
      },
      (secureUrl) => {
        setVideoUrl(secureUrl);
        setVideoUploadProgress(null);
        Alert.alert('Upload Completed', 'Video uploaded successfully to Cloudinary!');
      },
      (errorMsg) => {
        console.error('[Cloudinary Video Upload Error]:', errorMsg);
        setVideoUploadProgress(null);
        Alert.alert('Upload Failed', errorMsg);
      }
    );
  };

  // Direct File uploader for Thumbnail using Cloudinary
  const handleThumbFileChange = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setThumbFileName(file.name);
    setThumbUploadProgress(0);

    uploadToCloudinary(
      file,
      'image',
      (progress) => {
        setThumbUploadProgress(progress);
      },
      (secureUrl) => {
        setThumbnailUrl(secureUrl);
        setThumbUploadProgress(null);
        Alert.alert('Upload Completed', 'Cover thumbnail uploaded successfully to Cloudinary!');
      },
      (errorMsg) => {
        console.error('[Cloudinary Thumb Upload Error]:', errorMsg);
        setThumbUploadProgress(null);
        Alert.alert('Upload Failed', errorMsg);
      }
    );
  };

  // Form submission handler
  const handleSaveDrama = async () => {
    console.log("AdminPanel: handleSaveDrama invoked!");
    
    // Fallbacks for undefined form values to prevent crash on trim
    const safeSeriesName = (seriesName || '').trim();
    const safeEpisodeTitle = (episodeTitle || '').trim();
    const safeThumbnailUrl = (thumbnailUrl || '').trim();
    const safeVideoUrl = (videoUrl || '').trim();
    const safeDescription = (description || '').trim();
    const safeCreator = (creator || '').trim();
    const safeTagsInput = (tagsInput || '');

    console.log("AdminPanel: Current Form Values:", {
      seriesName: safeSeriesName,
      episodeTitle: safeEpisodeTitle,
      thumbnailUrl: safeThumbnailUrl,
      videoUrl: safeVideoUrl,
      description: safeDescription,
      category,
      duration,
      episodeNumber,
      creator: safeCreator,
      tagsInput: safeTagsInput,
      isTrending,
      isFeatured
    });

    if (!safeSeriesName || !safeEpisodeTitle || !safeThumbnailUrl || !safeVideoUrl) {
      console.warn("AdminPanel: Form Validation Failed - missing required fields");
      setAdminToast({ type: 'error', message: 'Form Error: Please fill out all required fields (*)' });
      Alert.alert('Form Error', 'Please fill out all required fields (*)');
      return;
    }

    try {
      setLoading(true);
      setAdminToast(null);

      const dramaId = editingId || `drama_${Date.now()}`;
      console.log(`AdminPanel: Starting save operation for ID: ${dramaId}`);

      const tags = safeTagsInput
        .split(',')
        .map(tag => tag.trim().replace(/^#/, ''))
        .filter(tag => tag.length > 0);

      const sId = (safeSeriesName || 'Amazing Series').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const dramaPayload: any = {
        id: dramaId,
        title: safeEpisodeTitle,
        description: safeDescription,
        category,
        thumbnailUrl: safeThumbnailUrl,
        videoUrl: safeVideoUrl,
        likesCount: editingId ? (dramas.find(d => d.id === editingId)?.likesCount || 0) : 0,
        commentsCount: editingId ? (dramas.find(d => d.id === editingId)?.commentsCount || 0) : 0,
        sharesCount: editingId ? (dramas.find(d => d.id === editingId)?.sharesCount || 0) : 0,
        creator: safeCreator || 'Story Rush Originals',
        duration: Number(duration) || 60,
        episodeNumber: Number(episodeNumber) || 1,
        seriesName: safeSeriesName,
        seriesId: sId,
        tags,
        isTrending: isTrending,
        isFeatured: isFeatured,
        isPremium: isPremiumEp,
        createdAt: editingId ? (dramas.find(d => d.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
        timestamp: editingId ? (dramas.find(d => d.id === editingId)?.timestamp || new Date().toISOString()) : new Date().toISOString()
      };

      console.log("AdminPanel: Saving payload to episodes collection:", dramaPayload);
      await setDoc(doc(db, 'episodes', dramaId), dramaPayload);
      console.log("AdminPanel: episodes collection saved successfully!");

      console.log("AdminPanel: Saving payload to dramas collection:", dramaPayload);
      await setDoc(doc(db, 'dramas', dramaId), dramaPayload);
      console.log("AdminPanel: dramas collection saved successfully!");

      if (sId) {
        try {
          await setDoc(doc(db, 'series', sId), {
            id: sId,
            name: safeSeriesName,
            category: category,
            thumbnailUrl: safeThumbnailUrl,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          console.log("AdminPanel: series collection synced with category & thumbnailUrl:", safeThumbnailUrl);
        } catch (seriesErr) {
          console.warn("Series category sync warning:", seriesErr);
        }
      }

      setAdminToast({ type: 'success', message: editingId ? 'Drama Updated!' : 'Drama Uploaded Successfully!' });
      Alert.alert('Success', editingId ? 'Drama Updated!' : 'Drama Uploaded Successfully!');
      
      console.log("AdminPanel: Success toast set, resetting form and shifting subTab.");
      resetForm();
      setSubTab('manage');
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.error("AdminPanel: Exception during save drama operation:", err);
      setAdminToast({ type: 'error', message: `Upload Failed: ${errMsg}` });
      Alert.alert('Upload Failed', errMsg);
      try {
        handleFirestoreError(err, OperationType.WRITE, `episodes/${editingId || 'new'}`);
      } catch (firestoreErr) {
        console.error('Firestore tracking error:', firestoreErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditEpisode = (drama: Drama & { isTrending?: boolean; isFeatured?: boolean }) => {
    setEditingId(drama.id);
    setSeriesName(drama.seriesName || '');
    setEpisodeTitle(drama.title || '');
    setDescription(drama.description || '');
    setCategory(drama.category || Category.ROMANCE);
    setThumbnailUrl(drama.thumbnailUrl || '');
    setVideoUrl(drama.videoUrl || '');
    setDuration(String(drama.duration || 60));
    setEpisodeNumber(String(drama.episodeNumber || 1));
    setCreator(drama.creator || 'Story Rush Originals');
    setTagsInput(drama.tags ? drama.tags.join(', ') : '');
    setIsTrending(drama.isTrending || false);
    setIsFeatured(drama.isFeatured || false);
    setIsPremiumEp(drama.isPremium || false);
    setOriginalVideoUrl(drama.videoUrl || '');
    setOriginalThumbUrl(drama.thumbnailUrl || '');
    setVideoFileName(null);
    setThumbFileName(null);
    setSubTab('create');
  };

  const resetForm = () => {
    setEditingId(null);
    setSeriesName('');
    setEpisodeTitle('');
    setDescription('');
    setCategory(Category.ROMANCE);
    setThumbnailUrl('');
    setVideoUrl('');
    setDuration('60');
    setEpisodeNumber('1');
    setCreator('Story Rush Originals');
    setTagsInput('');
    setIsTrending(false);
    setIsFeatured(false);
    setIsPremiumEp(false);
    setOriginalVideoUrl(null);
    setOriginalThumbUrl(null);
    setVideoFileName(null);
    setThumbFileName(null);
  };

  const handleDeleteEpisode = (dramaId: string) => {
    const item = dramas.find(d => d.id === dramaId);
    if (item) {
      setSelectedDeleteEpisode(item);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDeleteEpisode) return;
    const dramaId = selectedDeleteEpisode.id;
    setLoading(true);
    setAdminToast(null);

    try {
      const videoUrl = selectedDeleteEpisode.videoUrl;
      const thumbnailUrl = selectedDeleteEpisode.thumbnailUrl;

      const videoPublicId = getCloudinaryPublicId(videoUrl);
      const thumbPublicId = getCloudinaryPublicId(thumbnailUrl);

      let deleteErrors: string[] = [];

      // 1. Delete associated video from Cloudinary if public ID is available
      if (videoPublicId) {
        try {
          await deleteFromCloudinary(videoPublicId, 'video');
        } catch (err: any) {
          console.error('[Cloudinary Video Deletion Error]:', err);
          deleteErrors.push(`Video cleanup failed: ${err.message || err}`);
        }
      }

      // 2. Delete associated thumbnail from Cloudinary if public ID is available
      if (thumbPublicId) {
        try {
          await deleteFromCloudinary(thumbPublicId, 'image');
        } catch (err: any) {
          console.error('[Cloudinary Thumbnail Deletion Error]:', err);
          deleteErrors.push(`Thumbnail cleanup failed: ${err.message || err}`);
        }
      }

      // 3. Delete the episode document from Firestore
      await deleteDoc(doc(db, 'dramas', dramaId));
      await deleteDoc(doc(db, 'episodes', dramaId));

      // 4. Show success message
      if (deleteErrors.length > 0) {
        const warnMsg = `Episode document deleted from database, but Cloudinary media cleanup was partial:\n- ${deleteErrors.join('\n- ')}\n\n(Verify your Cloudinary API Key & Secret in settings to allow complete deletion)`;
        setAdminToast({ type: 'success', message: warnMsg });
        Alert.alert('Deleted with Media Warnings', warnMsg);
      } else {
        setAdminToast({ type: 'success', message: `Successfully deleted "${selectedDeleteEpisode.title}" and its associated Cloudinary files.` });
        Alert.alert('Deleted', 'Episode and its associated media files deleted successfully.');
      }

      setSelectedDeleteEpisode(null);
    } catch (err: any) {
      // 5. If deletion fails, show exact error message
      const errMsg = err.message || String(err);
      setAdminToast({ type: 'error', message: `Deletion failed: ${errMsg}` });
      Alert.alert('Deletion Failed', errMsg);
      setSelectedDeleteEpisode(null);
    } finally {
      setLoading(false);
    }
  };

  // Categories management handlers
  const handleSaveCategory = async () => {
    if (!catName.trim() || !catIcon.trim()) {
      Alert.alert('Form Error', 'Please fill out Name and Icon');
      return;
    }
    setLoading(true);
    const finalId = editingCategory ? editingCategory.id : (catId.trim().toLowerCase() || `cat_${Date.now()}`);
    const catPayload: DramaCategory = {
      id: finalId,
      name: catName.trim(),
      icon: catIcon.trim(),
      desc: catDesc.trim(),
      createdAt: editingCategory ? editingCategory.createdAt : new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'categories', finalId), catPayload);
      Alert.alert('Success', editingCategory ? 'Category Updated!' : 'Category Created!');
      resetCategoryForm();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `categories/${finalId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategoryInit = (cat: DramaCategory) => {
    setEditingCategory(cat);
    setCatId(cat.id);
    setCatName(cat.name);
    setCatIcon(cat.icon);
    setCatDesc(cat.desc);
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCatId('');
    setCatName('');
    setCatIcon('');
    setCatDesc('');
  };

  const handleDeleteCategory = async (id: string) => {
    Alert.alert(
      'Delete Category',
      'Are you sure you want to delete this Category?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'categories', id));
              Alert.alert('Deleted', 'Category deleted successfully.');
            } catch (err) {
              handleFirestoreError(err, OperationType.DELETE, `categories/${id}`);
            }
          }
        }
      ]
    );
  };

  // Series management handlers
  const handleSaveSeries = async () => {
    if (!seriesTitle.trim() || !seriesCategory.trim() || !seriesThumb.trim()) {
      Alert.alert('Form Error', 'Please fill out Title, Category, and Thumbnail');
      return;
    }

    setLoading(true);
    const finalId = editingSeries ? editingSeries.id : (seriesIdInput.trim().toLowerCase() || `series_${Date.now()}`);
    const tags = seriesTags
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(t => t.length > 0);

    const seriesPayload: Series = {
      id: finalId,
      name: seriesTitle.trim(),
      description: seriesDesc.trim(),
      category: seriesCategory.trim(),
      thumbnailUrl: seriesThumb.trim(),
      creator: seriesCreator.trim() || 'Story Rush Originals',
      tags,
      createdAt: editingSeries ? editingSeries.createdAt : new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'series', finalId), seriesPayload);

      // Sync matching episodes in 'episodes' and 'dramas'
      const matchingDramas = dramas.filter(d => 
        d.seriesId === finalId || 
        d.seriesName?.trim().toLowerCase() === seriesTitle.trim().toLowerCase()
      );
      for (const d of matchingDramas) {
        try {
          await setDoc(doc(db, 'episodes', d.id), { thumbnailUrl: seriesThumb.trim() }, { merge: true });
          await setDoc(doc(db, 'dramas', d.id), { thumbnailUrl: seriesThumb.trim() }, { merge: true });
        } catch (e) {
          console.warn("Failed to sync episode thumbnail on series save:", e);
        }
      }

      Alert.alert('Success', editingSeries ? 'Series Updated!' : 'Series Created!');
      resetSeriesForm();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `series/${finalId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSeriesInit = (ser: Series) => {
    setEditingSeries(ser);
    setSeriesIdInput(ser.id);
    setSeriesTitle(ser.name || '');
    setSeriesDesc(ser.description || '');
    setSeriesCategory(ser.category || '');
    setSeriesThumb(ser.thumbnailUrl || '');
    setSeriesCreator(ser.creator || '');
    setSeriesTags(ser.tags ? ser.tags.join(', ') : '');
  };

  const resetSeriesForm = () => {
    setEditingSeries(null);
    setSeriesIdInput('');
    setSeriesTitle('');
    setSeriesDesc('');
    setSeriesCategory('');
    setSeriesThumb('');
    setSeriesCreator('');
    setSeriesTags('');
  };

  const handleDeleteSeries = async (id: string) => {
    Alert.alert(
      'Delete Series',
      'Are you sure you want to delete this Series?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'series', id));
              Alert.alert('Deleted', 'Series deleted successfully.');
            } catch (err) {
              handleFirestoreError(err, OperationType.DELETE, `series/${id}`);
            }
          }
        }
      ]
    );
  };

  // Toggle user permissions
  const handleToggleAdmin = async (user: any) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: newRole });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleTogglePremium = async (user: any) => {
    const newPremium = !user.isPremium;
    try {
      await updateDoc(doc(db, 'users', user.uid), { 
        isPremium: newPremium,
        premiumExpiresAt: newPremium ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  };



  // Compute stats for Dashboard
  const totalUsers = usersList.length;
  const totalVideos = dramas.length;
  const totalLikes = dbLikesCount || dramas.reduce((acc, curr) => acc + (curr.likesCount || 0), 0);
  const totalComments = dbCommentsCount || dramas.reduce((acc, curr) => acc + (curr.commentsCount || 0), 0);
  const totalShares = dramas.reduce((acc, curr) => acc + (curr.sharesCount || 0), 0);

  // Top Performing dramas by likes count
  const topDramas = [...dramas].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0)).slice(0, 5);

  // Filtered dramas for Manage tab
  const filteredDramas = dramas.filter((d) => {
    const matchesSearch = 
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.seriesName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = 
      categoryFilter === 'all' || 
      d.category.toLowerCase() === categoryFilter.toLowerCase();

    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'trending' && d.isTrending) ||
      (statusFilter === 'featured' && d.isFeatured);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const TABS: { key: AdminSubTab; label: string; icon: any }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: ShieldCheck },
    { key: 'create', label: 'Add Ep', icon: FolderPlus },
    { key: 'manage', label: 'Manage', icon: Play },
    { key: 'series', label: 'Series', icon: Clapperboard },
    { key: 'categories', label: 'Categories', icon: Layers },
    { key: 'users', label: 'Users', icon: Users }
  ];

  // Render Login Screen if not verified yet
  if (!isAdminVerified) {
    return (
      <View style={tw`flex-1 bg-neutral-950 items-center justify-center p-6`}>
        <View style={tw`w-full max-w-sm bg-neutral-900 border border-neutral-800 p-6 rounded-[28px] shadow-2xl gap-5`}>
          <View style={tw`items-center`}>
            <View style={tw`w-12 h-12 bg-red-600/10 rounded-2xl items-center justify-center mb-3`}>
              <Lock size={22} color="#ef4444" />
            </View>
            <Text style={tw`text-lg font-black text-white uppercase tracking-wider text-center`}>Secure Admin Entrance</Text>
            <Text style={tw`text-[10px] text-neutral-400 mt-1 text-center`}>Authentication required for database access</Text>
          </View>

          {loginError && (
            <View style={tw`bg-red-500/10 border border-red-500/30 p-3 rounded-xl`}>
              <Text style={tw`text-[10px] text-red-500 leading-relaxed font-semibold`}>{loginError}</Text>
            </View>
          )}

          <View style={tw`gap-4`}>
            {/* Quick Access passcode */}
            <View>
              <Text style={tw`text-[9px] text-neutral-400 font-bold uppercase mb-1`}>Secure Passcode</Text>
              <TextInput
                placeholder="Enter admin passcode (e.g. ADMIN_STORY)"
                placeholderTextColor="#737373"
                value={passcode}
                onChangeText={setPasscode}
                secureTextEntry={!showPassword}
                style={tw`w-full bg-neutral-950 text-xs text-white px-3 py-2.5 rounded-xl border border-neutral-800`}
              />
            </View>

            <View style={tw`flex-row items-center justify-between`}>
              <Text style={tw`text-neutral-500 text-[10px] font-bold`}>OR SIGN IN WITH EMAIL:</Text>
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={tw`flex-row items-center gap-1`}>
                {showPassword ? <EyeOff size={12} color="#737373" /> : <Eye size={12} color="#737373" />}
                <Text style={tw`text-[9px] text-neutral-500 font-extrabold uppercase`}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>

            <View>
              <Text style={tw`text-[9px] text-neutral-400 font-bold uppercase mb-1`}>Admin Email</Text>
              <TextInput
                placeholder="admin@storyrush.com"
                placeholderTextColor="#737373"
                value={adminEmail}
                onChangeText={setAdminEmail}
                style={tw`w-full bg-neutral-950 text-xs text-white px-3 py-2.5 rounded-xl border border-neutral-800`}
              />
            </View>

            <View>
              <Text style={tw`text-[9px] text-neutral-400 font-bold uppercase mb-1`}>Admin Password</Text>
              <TextInput
                placeholder="••••••••"
                placeholderTextColor="#737373"
                value={adminPassword}
                onChangeText={setAdminPassword}
                secureTextEntry={!showPassword}
                style={tw`w-full bg-neutral-950 text-xs text-white px-3 py-2.5 rounded-xl border border-neutral-800`}
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleAdminLogin}
            disabled={loginLoading}
            style={tw`w-full bg-red-600 py-3.5 rounded-xl items-center justify-center flex-row shadow-lg`}
          >
            {loginLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <ShieldCheck size={16} color="#ffffff" style={tw`mr-2`} />
                <Text style={tw`text-white text-xs font-black uppercase tracking-wider`}>Authorize Entrance</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={tw`items-center`}>
            <Text style={tw`text-[10px] text-neutral-500 underline font-bold`}>Return to App Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-neutral-950 relative`}>
      {/* Hidden Web file inputs */}
      {Platform.OS === 'web' && (
        <>
          <input
            type="file"
            ref={videoInputRef}
            accept="video/*"
            style={{ display: 'none' }}
            onChange={handleVideoFileChange}
          />
          <input
            type="file"
            ref={thumbInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleThumbFileChange}
          />
        </>
      )}

      {/* Header */}
      <View style={tw`p-4 bg-neutral-900 border-b border-neutral-800 flex-row items-center justify-between`}>
        <View style={tw`flex-row items-center`}>
          <ShieldCheck size={18} color="#ef4444" style={tw`mr-2`} />
          <Text style={tw`text-sm font-black text-white uppercase tracking-wider`}>Admin Console</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={tw`p-1.5 bg-neutral-950 rounded-full`}>
          <X size={18} color="#a3a3a3" />
        </TouchableOpacity>
      </View>

      {/* Responsive Tabs Panel */}
      <View style={tw`flex-row flex-wrap bg-neutral-900 border-b border-neutral-800 p-1`}>
        {TABS.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = subTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setSubTab(tab.key)}
              style={tw`flex-1 min-w-[50px] py-2 items-center justify-center rounded-lg ${
                isActive ? 'bg-red-600/10 border border-red-500/30' : ''
              }`}
            >
              <TabIcon size={14} color={isActive ? '#ef4444' : '#737373'} style={tw`mb-0.5`} />
              <Text style={tw`text-[8px] uppercase tracking-wider font-extrabold ${
                isActive ? 'text-red-500' : 'text-neutral-500'
              }`}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={tw`p-4 pb-12`}>
        {adminToast && (
          <View style={tw`mb-4 bg-neutral-900 border ${adminToast.type === 'success' ? 'border-emerald-500/30' : 'border-red-500/30'} p-3.5 rounded-2xl flex-row items-center justify-between shadow-lg`}>
            <View style={tw`flex-row items-center flex-1 pr-4`}>
              <View style={tw`w-1.5 h-1.5 rounded-full ${adminToast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'} mr-2`} />
              <Text style={tw`text-[11px] font-bold ${adminToast.type === 'success' ? 'text-emerald-400' : 'text-red-400'} leading-relaxed`}>
                {adminToast.message}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setAdminToast(null)} style={tw`p-1.5 bg-neutral-950 rounded-full`}>
              <X size={12} color="#a3a3a3" />
            </TouchableOpacity>
          </View>
        )}

        {loading && (
          <View style={tw`py-4 flex-row justify-center items-center`}>
            <ActivityIndicator size="small" color="#dc2626" style={tw`mr-2`} />
            <Text style={tw`text-neutral-400 text-xs`}>Processing database action...</Text>
          </View>
        )}

        {/* 1. Dashboard View */}
        {subTab === 'dashboard' && (
          <View style={tw`gap-5`}>
            <Text style={tw`text-xs font-bold text-neutral-400 uppercase tracking-widest`}>
              STORY RUSH ENGAGEMENT DASHBOARD
            </Text>

            {/* Metrics cards grid */}
            <View style={tw`flex-row flex-wrap gap-3`}>
              <View style={tw`flex-1 min-w-[100px] bg-neutral-900 border border-neutral-800 p-3.5 rounded-2xl`}>
                <Users size={16} color="#c084fc" style={tw`mb-2`} />
                <Text style={tw`text-lg font-black text-white`}>{totalUsers}</Text>
                <Text style={tw`text-[9px] text-neutral-500 uppercase font-black`}>Binge Users</Text>
              </View>

              <View style={tw`flex-1 min-w-[100px] bg-neutral-900 border border-neutral-800 p-3.5 rounded-2xl`}>
                <Clapperboard size={16} color="#60a5fa" style={tw`mb-2`} />
                <Text style={tw`text-lg font-black text-white`}>{totalVideos}</Text>
                <Text style={tw`text-[9px] text-neutral-500 uppercase font-black`}>Clips / Episodes</Text>
              </View>

              <View style={tw`flex-1 min-w-[100px] bg-neutral-900 border border-neutral-800 p-3.5 rounded-2xl`}>
                <Heart size={16} color="#f472b6" style={tw`mb-2`} />
                <Text style={tw`text-lg font-black text-white`}>{String(totalLikes).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</Text>
                <Text style={tw`text-[9px] text-neutral-500 uppercase font-black`}>Total Likes</Text>
              </View>

              <View style={tw`flex-1 min-w-[100px] bg-neutral-900 border border-neutral-800 p-3.5 rounded-2xl`}>
                <MessageSquare size={16} color="#4ade80" style={tw`mb-2`} />
                <Text style={tw`text-lg font-black text-white`}>{String(totalComments).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</Text>
                <Text style={tw`text-[9px] text-neutral-500 uppercase font-black`}>Total Comments</Text>
              </View>

              <View style={tw`flex-1 min-w-[100px] bg-neutral-900 border border-neutral-800 p-3.5 rounded-2xl`}>
                <Share2 size={16} color="#fb923c" style={tw`mb-2`} />
                <Text style={tw`text-lg font-black text-white`}>{String(totalShares).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</Text>
                <Text style={tw`text-[9px] text-neutral-500 uppercase font-black`}>Total Shares</Text>
              </View>
            </View>

            {/* Top Performing Clips Table */}
            <View style={tw`bg-neutral-900 border border-neutral-800 p-4 rounded-2xl mt-2`}>
              <Text style={tw`text-[10px] font-black text-white uppercase tracking-wider mb-3`}>
                ⭐ Top Performing Videos (Most Liked)
              </Text>

              {topDramas.length === 0 ? (
                <Text style={tw`text-xs text-neutral-500 font-light`}>No video clips available</Text>
              ) : (
                <View style={tw`gap-3`}>
                  {topDramas.map((drama, idx) => (
                    <View key={drama.id} style={tw`flex-row items-center justify-between border-b border-neutral-800/40 pb-2.5`}>
                      <View style={tw`flex-row items-center flex-1 mr-2`}>
                        <Text style={tw`text-xs text-red-500 font-black mr-2.5`}>#{idx + 1}</Text>
                        <Image source={{ uri: drama.thumbnailUrl }} style={tw`w-8 h-11 rounded bg-black shrink-0`} resizeMode="cover" />
                        <View style={tw`ml-2.5 flex-1`}>
                          <Text style={tw`text-xs font-bold text-white`} numberOfLines={1}>{drama.seriesName}</Text>
                          <Text style={tw`text-[9px] text-neutral-400 mt-0.5`} numberOfLines={1}>{drama.title} • Ep. {drama.episodeNumber}</Text>
                        </View>
                      </View>
                      <View style={tw`flex-row items-center gap-1.5 shrink-0`}>
                        <Heart size={10} color="#f472b6" fill="#f472b6" />
                        <Text style={tw`text-[10px] font-bold text-neutral-200`}>{drama.likesCount}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* 2. Create / Edit Form */}
        {subTab === 'create' && (
          <View style={tw`gap-4`}>
            <Text style={tw`text-xs font-bold text-neutral-400 uppercase tracking-widest flex-row items-center`}>
              <Sparkles size={12} color="#ef4444" style={tw`mr-1`} />
              {editingId ? 'Edit Episode Entry' : 'Add New Episode'}
            </Text>

            {/* Cloudinary Configuration Settings Card */}
            <View style={tw`bg-neutral-900 border border-neutral-800 p-4 rounded-2xl gap-3`}>
              <View style={tw`flex-row items-center justify-between`}>
                <View style={tw`flex-row items-center`}>
                  <Database size={13} color="#f59e0b" style={tw`mr-1.5`} />
                  <Text style={tw`text-[11px] font-black text-amber-500 uppercase tracking-wider`}>
                    Cloudinary Settings (Required)
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={handleSaveCloudinaryConfig}
                  style={tw`bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg`}
                >
                  <Text style={tw`text-[9px] text-amber-500 font-extrabold uppercase`}>Save Config</Text>
                </TouchableOpacity>
              </View>

              <Text style={tw`text-[10px] text-neutral-400 leading-relaxed`}>
                To enable uploading local video files, covers, and secure asset deletion, please fill in your Cloudinary credentials. These are securely persisted in your browser's local storage.
              </Text>

              <View style={tw`flex-row gap-3`}>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-[8px] text-neutral-500 font-bold uppercase mb-1`}>Cloud Name</Text>
                  <TextInput
                    placeholder="e.g. dxyz123"
                    placeholderTextColor="#525252"
                    value={cloudinaryCloudName}
                    onChangeText={setCloudinaryCloudName}
                    style={tw`w-full bg-neutral-950 text-xs text-white px-2.5 py-2 rounded-xl border border-neutral-800`}
                  />
                </View>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-[8px] text-neutral-500 font-bold uppercase mb-1`}>Upload Preset (Unsigned)</Text>
                  <TextInput
                    placeholder="e.g. storyrush_preset"
                    placeholderTextColor="#525252"
                    value={cloudinaryUploadPreset}
                    onChangeText={setCloudinaryUploadPreset}
                    style={tw`w-full bg-neutral-950 text-xs text-white px-2.5 py-2 rounded-xl border border-neutral-800`}
                  />
                </View>
              </View>

              <View style={tw`flex-row gap-3`}>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-[8px] text-neutral-500 font-bold uppercase mb-1`}>API Key (For Deletion)</Text>
                  <TextInput
                    placeholder="e.g. 123456789"
                    placeholderTextColor="#525252"
                    value={cloudinaryApiKey}
                    onChangeText={setCloudinaryApiKey}
                    style={tw`w-full bg-neutral-950 text-xs text-white px-2.5 py-2 rounded-xl border border-neutral-800`}
                  />
                </View>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-[8px] text-neutral-500 font-bold uppercase mb-1`}>API Secret (For Deletion)</Text>
                  <TextInput
                    placeholder="API Secret Key"
                    placeholderTextColor="#525252"
                    secureTextEntry
                    value={cloudinaryApiSecret}
                    onChangeText={setCloudinaryApiSecret}
                    style={tw`w-full bg-neutral-950 text-xs text-white px-2.5 py-2 rounded-xl border border-neutral-800`}
                  />
                </View>
              </View>
            </View>

            <View style={tw`gap-3`}>
              <View>
                <Text style={tw`text-[9px] text-neutral-500 font-bold uppercase mb-1`}>Series Title / Name *</Text>
                <TextInput
                  placeholder="e.g. CEO's Secret Dancer"
                  placeholderTextColor="#737373"
                  value={seriesName}
                  onChangeText={setSeriesName}
                  style={tw`w-full bg-neutral-900 text-xs text-white px-3 py-2.5 rounded-xl border border-neutral-800`}
                />
              </View>

              <View>
                <Text style={tw`text-[9px] text-neutral-500 font-bold uppercase mb-1`}>Episode Title *</Text>
                <TextInput
                  placeholder="e.g. The Unwanted Groom"
                  placeholderTextColor="#737373"
                  value={episodeTitle}
                  onChangeText={setEpisodeTitle}
                  style={tw`w-full bg-neutral-900 text-xs text-white px-3 py-2.5 rounded-xl border border-neutral-800`}
                />
              </View>

              <View>
                <Text style={tw`text-[9px] text-neutral-500 font-bold uppercase mb-1`}>Description</Text>
                <TextInput
                  placeholder="Sophia makes a binding agreement with..."
                  placeholderTextColor="#737373"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={2}
                  style={tw`w-full bg-neutral-900 text-xs text-white px-3 py-2.5 rounded-xl border border-neutral-800 min-h-[50px]`}
                />
              </View>

              <View>
                <Text style={tw`text-[9px] text-neutral-500 font-bold uppercase mb-2`}>Category Genre Tag *</Text>
                <View style={tw`flex-row flex-wrap gap-2`}>
                  {Array.from(new Set([
                    ...Object.values(Category),
                    ...categories.map(c => c.name),
                    ...(category ? [category] : [])
                  ])).map((cat) => {
                    const isSelected = category === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setCategory(cat as any)}
                        style={tw`px-3 py-1.5 rounded-lg border ${
                          isSelected ? 'bg-red-600 border-red-500' : 'bg-neutral-900 border-neutral-800'
                        }`}
                      >
                        <Text style={tw`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-neutral-400'}`}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Direct Cloudinary Upload Section */}
              <View style={tw`bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800/80 gap-3`}>
                <Text style={tw`text-[9px] text-amber-500 font-black uppercase tracking-wider`}>
                  ☁️ Direct Cloudinary Media Uploader
                </Text>

                {/* Video File Upload */}
                <View style={tw`gap-1.5`}>
                  <Text style={tw`text-[9px] text-neutral-400 font-bold uppercase`}>Video File Selection</Text>
                  {Platform.OS === 'web' ? (
                    <TouchableOpacity
                      onPress={() => videoInputRef.current?.click()}
                      style={tw`w-full bg-neutral-950 border border-neutral-800 border-dashed p-3 rounded-xl flex-row items-center justify-between`}
                    >
                      <View style={tw`flex-row items-center`}>
                        <UploadCloud size={14} color="#737373" style={tw`mr-2`} />
                        <Text style={tw`text-xs text-neutral-400`} numberOfLines={1}>
                          {videoFileName || 'Click to select vertical MP4 video file...'}
                        </Text>
                      </View>
                      {videoUploadProgress !== null && (
                        <Text style={tw`text-[10px] text-red-500 font-bold`}>{videoUploadProgress}%</Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <Text style={tw`text-[9px] text-neutral-500 italic`}>Web platform required for local storage selector</Text>
                  )}
                  {videoUploadProgress !== null && (
                    <View style={tw`w-full h-1 bg-neutral-950 rounded-full overflow-hidden`}>
                      <View style={[tw`h-full bg-red-600`, { width: `${videoUploadProgress}%` }]} />
                    </View>
                  )}
                </View>

                {/* Thumbnail File Upload */}
                <View style={tw`gap-1.5`}>
                  <Text style={tw`text-[9px] text-neutral-400 font-bold uppercase`}>Cover Thumbnail File Selection</Text>
                  {Platform.OS === 'web' ? (
                    <TouchableOpacity
                      onPress={() => thumbInputRef.current?.click()}
                      style={tw`w-full bg-neutral-950 border border-neutral-800 border-dashed p-3 rounded-xl flex-row items-center justify-between`}
                    >
                      <View style={tw`flex-row items-center`}>
                        <UploadCloud size={14} color="#737373" style={tw`mr-2`} />
                        <Text style={tw`text-xs text-neutral-400`} numberOfLines={1}>
                          {thumbFileName || 'Click to select portrait JPEG/PNG cover file...'}
                        </Text>
                      </View>
                      {thumbUploadProgress !== null && (
                        <Text style={tw`text-[10px] text-red-500 font-bold`}>{thumbUploadProgress}%</Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <Text style={tw`text-[9px] text-neutral-500 italic`}>Web platform required for local storage selector</Text>
                  )}
                  {thumbUploadProgress !== null && (
                    <View style={tw`w-full h-1 bg-neutral-950 rounded-full overflow-hidden`}>
                      <View style={[tw`h-full bg-red-600`, { width: `${thumbUploadProgress}%` }]} />
                    </View>
                  )}
                </View>
              </View>

              <View>
                <Text style={tw`text-[9px] text-neutral-500 font-bold uppercase mb-1`}>Cover Thumbnail URL * (or uploaded above)</Text>
                <TextInput
                  placeholder="https://images.unsplash.com/..."
                  placeholderTextColor="#737373"
                  value={thumbnailUrl}
                  onChangeText={setThumbnailUrl}
                  style={tw`w-full bg-neutral-900 text-xs text-white px-3 py-2.5 rounded-xl border border-neutral-800`}
                />
              </View>

              <View>
                <Text style={tw`text-[9px] text-neutral-500 font-bold uppercase mb-1`}>Drama Video Stream URL * (or uploaded above)</Text>
                <TextInput
                  placeholder="https://commondatastorage.googleapis.com/..."
                  placeholderTextColor="#737373"
                  value={videoUrl}
                  onChangeText={setVideoUrl}
                  style={tw`w-full bg-neutral-900 text-xs text-white px-3 py-2.5 rounded-xl border border-neutral-800`}
                />
              </View>

              <View style={tw`flex-row gap-3`}>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-[9px] text-neutral-500 font-bold uppercase mb-1`}>Duration (sec)</Text>
                  <TextInput
                    placeholder="60"
                    placeholderTextColor="#737373"
                    keyboardType="numeric"
                    value={duration}
                    onChangeText={setDuration}
                    style={tw`w-full bg-neutral-900 text-xs text-white px-3 py-2.5 rounded-xl border border-neutral-800`}
                  />
                </View>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-[9px] text-neutral-500 font-bold uppercase mb-1`}>Episode Num</Text>
                  <TextInput
                    placeholder="1"
                    placeholderTextColor="#737373"
                    keyboardType="numeric"
                    value={episodeNumber}
                    onChangeText={setEpisodeNumber}
                    style={tw`w-full bg-neutral-900 text-xs text-white px-3 py-2.5 rounded-xl border border-neutral-800`}
                  />
                </View>
              </View>

              <View>
                <Text style={tw`text-[9px] text-neutral-500 font-bold uppercase mb-1`}>Creator Name</Text>
                <TextInput
                  placeholder="Story Rush Originals"
                  placeholderTextColor="#737373"
                  value={creator}
                  onChangeText={setCreator}
                  style={tw`w-full bg-neutral-900 text-xs text-white px-3 py-2.5 rounded-xl border border-neutral-800`}
                />
              </View>

              <View>
                <Text style={tw`text-[9px] text-neutral-500 font-bold uppercase mb-1`}>Comma-separated Tags</Text>
                <TextInput
                  placeholder="ceo, drama, romance"
                  placeholderTextColor="#737373"
                  value={tagsInput}
                  onChangeText={setTagsInput}
                  style={tw`w-full bg-neutral-900 text-xs text-white px-3 py-2.5 rounded-xl border border-neutral-800`}
                />
              </View>

              {/* Requirement: Mark videos as Trending, Featured, or Premium */}
              <View style={tw`flex-row gap-3 mt-1.5`}>
                <TouchableOpacity
                  onPress={() => setIsTrending(!isTrending)}
                  style={tw`flex-1 bg-neutral-900 border border-neutral-800/80 p-3 rounded-xl flex-row items-center justify-between`}
                >
                  <View style={tw`flex-row items-center`}>
                    <TrendingUp size={14} color="#ef4444" style={tw`mr-2`} />
                    <Text style={tw`text-[10px] text-neutral-300 font-extrabold uppercase`}>Trending</Text>
                  </View>
                  <View style={tw`w-7 h-4 rounded-full ${isTrending ? 'bg-red-600' : 'bg-neutral-850'} p-0.5 justify-center`}>
                    <View style={tw`w-3 h-3 rounded-full bg-white ${isTrending ? 'self-end' : 'self-start'}`} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIsFeatured(!isFeatured)}
                  style={tw`flex-1 bg-neutral-900 border border-neutral-800/80 p-3 rounded-xl flex-row items-center justify-between`}
                >
                  <View style={tw`flex-row items-center`}>
                    <Award size={14} color="#f59e0b" style={tw`mr-2`} />
                    <Text style={tw`text-[10px] text-neutral-300 font-extrabold uppercase`}>Featured</Text>
                  </View>
                  <View style={tw`w-7 h-4 rounded-full ${isFeatured ? 'bg-amber-500' : 'bg-neutral-850'} p-0.5 justify-center`}>
                    <View style={tw`w-3 h-3 rounded-full bg-white ${isFeatured ? 'self-end' : 'self-start'}`} />
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => setIsPremiumEp(!isPremiumEp)}
                style={tw`w-full bg-neutral-900 border border-neutral-800/80 p-3 rounded-xl flex-row items-center justify-between mt-1`}
              >
                <View style={tw`flex-row items-center`}>
                  <Lock size={14} color="#f59e0b" style={tw`mr-2`} />
                  <Text style={tw`text-[10px] text-neutral-300 font-extrabold uppercase`}>Premium (Locked Episode)</Text>
                </View>
                <View style={tw`w-7 h-4 rounded-full ${isPremiumEp ? 'bg-amber-500' : 'bg-neutral-850'} p-0.5 justify-center`}>
                  <View style={tw`w-3 h-3 rounded-full bg-white ${isPremiumEp ? 'self-end' : 'self-start'}`} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={tw`flex-row gap-3 mt-4`}>
              {editingId && (
                <TouchableOpacity
                  onPress={resetForm}
                  style={tw`flex-1 bg-neutral-900 border border-neutral-800 py-3.5 rounded-xl items-center`}
                >
                  <Text style={tw`text-xs text-neutral-400 font-bold`}>Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleSaveDrama}
                style={tw`flex-2 bg-red-600 py-3.5 rounded-xl items-center justify-center flex-row shadow-lg`}
              >
                <Plus size={16} color="#ffffff" style={tw`mr-2`} />
                <Text style={tw`text-white text-xs font-black uppercase tracking-wider`}>
                  {editingId ? 'Save Changes' : 'Upload Episode'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 3. Manage Feed List (Edit & Delete, Search & Filter) */}
        {subTab === 'manage' && (
          <View style={tw`gap-4`}>
            {/* Search and Filters controls */}
            <View style={tw`gap-3`}>
              {/* Search Bar */}
              <View style={tw`flex-row items-center bg-neutral-900 border border-neutral-800 px-3 py-2.5 rounded-xl`}>
                <Search size={14} color="#737373" style={tw`mr-2`} />
                <TextInput
                  placeholder="Search series, title, or tags..."
                  placeholderTextColor="#737373"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={tw`flex-1 text-xs text-white p-0`}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={14} color="#737373" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Filtering category */}
              <View style={tw`flex-row gap-2`}>
                {/* Category Filter */}
                <View style={tw`flex-1`}>
                  <Text style={tw`text-[8px] text-neutral-500 font-black uppercase mb-1`}>Filter by Genre</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`flex-row gap-1.5`}>
                    {['all', ...(categories.length > 0 ? categories.map(c => c.name) : ['Romance', 'Action', 'Horror', 'Comedy', 'Thriller'])].map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setCategoryFilter(cat)}
                        style={tw`px-2.5 py-1.5 rounded-lg border ${
                          categoryFilter === cat ? 'bg-red-600/10 border-red-500/35' : 'bg-neutral-900 border-neutral-800'
                        }`}
                      >
                        <Text style={tw`text-[9px] font-extrabold uppercase ${
                          categoryFilter === cat ? 'text-red-500' : 'text-neutral-400'
                        }`}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Status Filter */}
                <View style={tw`flex-1`}>
                  <Text style={tw`text-[8px] text-neutral-500 font-black uppercase mb-1`}>Filter by Status</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`flex-row gap-1.5`}>
                    {[
                      { key: 'all', label: 'All' },
                      { key: 'trending', label: 'Trending 🔥' },
                      { key: 'featured', label: 'Featured ⭐' }
                    ].map((stat) => (
                      <TouchableOpacity
                        key={stat.key}
                        onPress={() => setStatusFilter(stat.key as any)}
                        style={tw`px-2.5 py-1.5 rounded-lg border ${
                          statusFilter === stat.key ? 'bg-amber-500/10 border-amber-500/35' : 'bg-neutral-900 border-neutral-800'
                        }`}
                      >
                        <Text style={tw`text-[9px] font-extrabold uppercase ${
                          statusFilter === stat.key ? 'text-amber-500' : 'text-neutral-400'
                        }`}>{stat.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>

            <Text style={tw`text-xs font-bold text-neutral-400 uppercase tracking-widest mt-2`}>
              Active Episodes ({filteredDramas.length})
            </Text>

            {filteredDramas.length === 0 ? (
              <View style={tw`py-12 items-center border border-dashed border-neutral-800 rounded-2xl`}>
                <Database size={24} color="#404040" style={tw`mb-2`} />
                <Text style={tw`text-xs font-medium text-neutral-400`}>No matching dramas found</Text>
              </View>
            ) : (
              <View style={tw`gap-3`}>
                {filteredDramas.map((drama) => (
                  <View 
                    key={drama.id}
                    style={tw`bg-neutral-900 p-3.5 rounded-2xl border border-neutral-850 flex-row justify-between items-center`}
                  >
                    <View style={tw`flex-row items-center flex-1 mr-3`}>
                      <Image source={{ uri: drama.thumbnailUrl }} style={tw`w-10 h-14 bg-black rounded-lg shrink-0`} resizeMode="cover" />
                      <View style={tw`ml-3 flex-1`}>
                        <View style={tw`flex-row items-center flex-wrap gap-1 mb-0.5`}>
                          <Text style={tw`text-xs font-bold text-neutral-200 mr-1`} numberOfLines={1}>{drama.seriesName}</Text>
                          {drama.isTrending && (
                            <View style={tw`bg-red-600/10 border border-red-500/30 px-1 py-0.2 rounded`}>
                              <Text style={tw`text-red-500 text-[7px] font-black uppercase`}>HOT</Text>
                            </View>
                          )}
                          {drama.isFeatured && (
                            <View style={tw`bg-amber-500/10 border border-amber-500/30 px-1 py-0.2 rounded`}>
                              <Text style={tw`text-amber-500 text-[7px] font-black uppercase`}>VIP</Text>
                            </View>
                          )}
                          {drama.isPremium && (
                            <View style={tw`bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded`}>
                              <Text style={tw`text-amber-500 text-[7px] font-black uppercase`}>🔒 LOCK</Text>
                            </View>
                          )}
                        </View>
                        <Text style={tw`text-[9px] text-neutral-500`}>
                          Ep. {drama.episodeNumber} - {drama.category}
                        </Text>
                        <Text style={tw`text-[8px] text-neutral-600 mt-0.5`} numberOfLines={1}>
                          {drama.title}
                        </Text>
                      </View>
                    </View>

                    <View style={tw`flex-row gap-2 shrink-0`}>
                      <TouchableOpacity
                        onPress={() => handleEditEpisode(drama)}
                        style={tw`w-8 h-8 rounded-full bg-neutral-950 border border-neutral-800 items-center justify-center`}
                      >
                        <Edit size={14} color="#3b82f6" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteEpisode(drama.id)}
                        style={tw`w-8 h-8 rounded-full bg-neutral-950 border border-neutral-800 items-center justify-center`}
                      >
                        <Trash2 size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 4. Series Management */}
        {subTab === 'series' && (
          <View style={tw`gap-4`}>
            <Text style={tw`text-xs font-bold text-neutral-400 uppercase tracking-widest`}>Series Directory</Text>
            
            <View style={tw`bg-neutral-900 p-4 rounded-2xl border border-neutral-800 gap-3`}>
              <Text style={tw`text-[10px] text-neutral-300 font-bold`}>
                {editingSeries ? 'Edit Series Detail' : 'Create New Series Catalog'}
              </Text>

              <TextInput
                placeholder="Series Title Name (e.g. CEO's Secret Bride)"
                placeholderTextColor="#737373"
                value={seriesTitle}
                onChangeText={setSeriesTitle}
                style={tw`w-full bg-neutral-950 text-xs text-white px-3 py-2 rounded-xl border border-neutral-800`}
              />

              <TextInput
                placeholder="Description / Logline"
                placeholderTextColor="#737373"
                value={seriesDesc}
                onChangeText={setSeriesDesc}
                multiline
                numberOfLines={2}
                style={tw`w-full bg-neutral-950 text-xs text-white px-3 py-2 rounded-xl border border-neutral-800`}
              />

              <TextInput
                placeholder="Category (romance, action, horror, comedy, thriller)"
                placeholderTextColor="#737373"
                value={seriesCategory}
                onChangeText={setSeriesCategory}
                style={tw`w-full bg-neutral-950 text-xs text-white px-3 py-2 rounded-xl border border-neutral-800`}
              />

              <TextInput
                placeholder="Banner Thumbnail URL"
                placeholderTextColor="#737373"
                value={seriesThumb}
                onChangeText={setSeriesThumb}
                style={tw`w-full bg-neutral-950 text-xs text-white px-3 py-2 rounded-xl border border-neutral-800`}
              />

              <TextInput
                placeholder="Creator"
                placeholderTextColor="#737373"
                value={seriesCreator}
                onChangeText={setSeriesCreator}
                style={tw`w-full bg-neutral-950 text-xs text-white px-3 py-2 rounded-xl border border-neutral-800`}
              />

              <TouchableOpacity
                onPress={handleSaveSeries}
                style={tw`w-full bg-red-600 py-3 rounded-xl items-center mt-2`}
              >
                <Text style={tw`text-white font-bold text-xs uppercase`}>
                  {editingSeries ? 'Update Series' : 'Create Series'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={tw`gap-3 mt-2`}>
              {seriesList.map((ser) => (
                <View key={ser.id} style={tw`bg-neutral-900 p-3 rounded-xl border border-neutral-850 flex-row justify-between items-center`}>
                  <View style={tw`flex-1 mr-2`}>
                    <Text style={tw`text-xs font-bold text-white`}>{ser.name}</Text>
                    <Text style={tw`text-[9px] text-neutral-400`}>{ser.category}</Text>
                  </View>
                  <View style={tw`flex-row gap-2`}>
                    <TouchableOpacity onPress={() => handleEditSeriesInit(ser)} style={tw`w-7 h-7 bg-neutral-950 items-center justify-center rounded-full border border-neutral-800`}>
                      <Edit size={12} color="#3b82f6" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteSeries(ser.id)} style={tw`w-7 h-7 bg-neutral-950 items-center justify-center rounded-full border border-neutral-800`}>
                      <Trash2 size={12} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 5. Categories Management */}
        {subTab === 'categories' && (
          <View style={tw`gap-4`}>
            <Text style={tw`text-xs font-bold text-neutral-400 uppercase tracking-widest`}>Category Directory</Text>

            <View style={tw`bg-neutral-900 p-4 rounded-2xl border border-neutral-800 gap-3`}>
              <Text style={tw`text-[10px] text-neutral-300 font-bold`}>
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </Text>

              <TextInput
                placeholder="Category Name ID (e.g. Romance)"
                placeholderTextColor="#737373"
                value={catName}
                onChangeText={setCatName}
                style={tw`w-full bg-neutral-950 text-xs text-white px-3 py-2 rounded-xl border border-neutral-800`}
              />

              <TextInput
                placeholder="Icon emoji (e.g. 💖)"
                placeholderTextColor="#737373"
                value={catIcon}
                onChangeText={setCatIcon}
                style={tw`w-full bg-neutral-950 text-xs text-white px-3 py-2 rounded-xl border border-neutral-800`}
              />

              <TextInput
                placeholder="Short Desc"
                placeholderTextColor="#737373"
                value={catDesc}
                onChangeText={setCatDesc}
                style={tw`w-full bg-neutral-950 text-xs text-white px-3 py-2 rounded-xl border border-neutral-800`}
              />

              <TouchableOpacity
                onPress={handleSaveCategory}
                style={tw`w-full bg-red-600 py-3 rounded-xl items-center mt-2`}
              >
                <Text style={tw`text-white font-bold text-xs uppercase`}>
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={tw`gap-3 mt-2`}>
              {categories.map((cat) => (
                <View key={cat.id} style={tw`bg-neutral-900 p-3 rounded-xl border border-neutral-850 flex-row justify-between items-center`}>
                  <View style={tw`flex-1 mr-2`}>
                    <Text style={tw`text-xs font-bold text-white`}>{cat.name} {cat.icon}</Text>
                    <Text style={tw`text-[9px] text-neutral-400`}>{cat.desc}</Text>
                  </View>
                  <View style={tw`flex-row gap-2`}>
                    <TouchableOpacity onPress={() => handleEditCategoryInit(cat)} style={tw`w-7 h-7 bg-neutral-950 items-center justify-center rounded-full border border-neutral-800`}>
                      <Edit size={12} color="#3b82f6" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteCategory(cat.id)} style={tw`w-7 h-7 bg-neutral-950 items-center justify-center rounded-full border border-neutral-800`}>
                      <Trash2 size={12} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 6. Users Management */}
        {subTab === 'users' && (
          <View style={tw`gap-4`}>
            <Text style={tw`text-xs font-bold text-neutral-400 uppercase tracking-widest`}>
              Binge Users Directory ({usersList.length})
            </Text>

            <View style={tw`gap-3`}>
              {usersList.map((user) => (
                <View 
                  key={user.uid}
                  style={tw`bg-neutral-900 p-3.5 rounded-2xl border border-neutral-850 flex-col gap-3`}
                >
                  <View style={tw`flex-row items-center gap-3`}>
                    <View style={tw`w-9 h-9 rounded-full bg-neutral-950 items-center justify-center overflow-hidden border border-white/10`}>
                      <Text style={tw`text-white text-xs font-bold`}>{user.displayName?.slice(0, 2).toUpperCase() || 'SR'}</Text>
                    </View>
                    <View style={tw`flex-1`}>
                      <Text style={tw`text-xs font-bold text-white`}>{user.displayName || 'Binger'}</Text>
                      <Text style={tw`text-[10px] text-neutral-500 mt-0.5`}>{user.email}</Text>
                    </View>
                  </View>

                  <View style={tw`flex-row gap-2 pt-2 border-t border-neutral-800/50`}>
                    <TouchableOpacity
                      onPress={() => handleToggleAdmin(user)}
                      style={tw`flex-1 py-1.5 px-2 rounded-lg border items-center justify-center flex-row ${
                        user.role === 'admin' ? 'bg-red-950/20 border-red-800/60' : 'bg-neutral-950 border-neutral-800'
                      }`}
                    >
                      <Text style={tw`text-[9px] font-bold ${
                        user.role === 'admin' ? 'text-red-400' : 'text-neutral-500'
                      }`}>ADMIN: {user.role === 'admin' ? 'ON' : 'OFF'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleTogglePremium(user)}
                      style={tw`flex-1 py-1.5 px-2 rounded-lg border items-center justify-center flex-row ${
                        user.isPremium ? 'bg-amber-950/20 border-amber-800/60' : 'bg-neutral-950 border-neutral-800'
                      }`}
                    >
                      <Text style={tw`text-[9px] font-bold ${
                        user.isPremium ? 'text-amber-400' : 'text-neutral-500'
                      }`}>VIP: {user.isPremium ? 'ON' : 'OFF'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}


      </ScrollView>

      {/* Hidden File Inputs for Web Direct Uploads */}
      {Platform.OS === 'web' && (
        <div style={{ display: 'none' }}>
          <input
            type="file"
            ref={videoInputRef}
            accept="video/mp4,video/*"
            onChange={handleVideoFileChange}
          />
          <input
            type="file"
            ref={thumbInputRef}
            accept="image/*"
            onChange={handleThumbFileChange}
          />
        </div>
      )}

      {/* Sleek Delete Confirmation Custom Overlay */}
      {selectedDeleteEpisode && (
        <View style={tw`absolute inset-0 bg-black/80 items-center justify-center p-6 z-50`}>
          <View style={tw`bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-xs items-center gap-4 shadow-2xl`}>
            <View style={tw`w-12 h-12 rounded-full bg-red-600/10 items-center justify-center`}>
              <Trash2 size={24} color="#ef4444" />
            </View>
            <View style={tw`items-center`}>
              <Text style={tw`text-white font-bold text-sm text-center mb-1`}>Delete Episode?</Text>
              <Text style={tw`text-neutral-400 text-xs text-center leading-relaxed px-2`}>
                Are you sure you want to permanently delete "{selectedDeleteEpisode.title}"? This action will delete the video and thumbnail from Cloudinary (if credentials are set) and Firestore.
              </Text>
            </View>
            <View style={tw`flex-row gap-3 w-full mt-2`}>
              <TouchableOpacity 
                onPress={() => setSelectedDeleteEpisode(null)}
                style={tw`flex-1 bg-neutral-800 py-3 rounded-xl items-center`}
              >
                <Text style={tw`text-neutral-300 text-xs font-bold`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleDeleteConfirm}
                style={tw`flex-1 bg-red-600 py-3 rounded-xl items-center`}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={tw`text-white text-xs font-bold`}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
