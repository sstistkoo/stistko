/**
 * Image Library Service
 * Handles image management and placeholders
 */

import { eventBus } from '../../../core/events.js';

export class ImageLibrary {
  /**
   * Get image categories
   */
  static getImageCategories() {
    return {
      placeholder: {
        name: '📦 Placeholder',
        images: [
          { name: 'Small 300x200', url: 'https://placehold.co/300x200/EEE/31343C', width: 300, height: 200 },
          { name: 'Medium 400x300', url: 'https://placehold.co/400x300/EEE/31343C', width: 400, height: 300 },
          { name: 'Large 800x600', url: 'https://placehold.co/800x600/EEE/31343C', width: 800, height: 600 },
          { name: 'HD 1200x800', url: 'https://placehold.co/1200x800/EEE/31343C', width: 1200, height: 800 },
          { name: 'Square 500x500', url: 'https://placehold.co/500x500/EEE/31343C', width: 500, height: 500 },
          { name: 'Banner 1200x300', url: 'https://placehold.co/1200x300/EEE/31343C', width: 1200, height: 300 }
        ]
      },
      unsplash: {
        name: '📷 Unsplash (Random)',
        images: [
          { name: 'Nature', url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&h=600&fit=crop', width: 800, height: 600 },
          { name: 'City', url: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&h=600&fit=crop', width: 800, height: 600 },
          { name: 'Food', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop', width: 800, height: 600 },
          { name: 'Technology', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop', width: 800, height: 600 },
          { name: 'People', url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=600&fit=crop', width: 800, height: 600 },
          { name: 'Animals', url: 'https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=800&h=600&fit=crop', width: 800, height: 600 },
          { name: 'Architecture', url: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&h=600&fit=crop', width: 800, height: 600 },
          { name: 'Business', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop', width: 800, height: 600 },
          { name: 'Travel', url: 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&h=600&fit=crop', width: 800, height: 600 },
          { name: 'Abstract', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&h=600&fit=crop', width: 800, height: 600 }
        ]
      },
      picsum: {
        name: '🖼️ Lorem Picsum',
        images: [
          { name: 'Random 400x300', url: 'https://picsum.photos/400/300', width: 400, height: 300 },
          { name: 'Random 800x600', url: 'https://picsum.photos/800/600', width: 800, height: 600 },
          { name: 'Random 1200x800', url: 'https://picsum.photos/1200/800', width: 1200, height: 800 },
          { name: 'Grayscale', url: 'https://picsum.photos/800/600?grayscale', width: 800, height: 600 },
          { name: 'Blur Effect', url: 'https://picsum.photos/800/600?blur=2', width: 800, height: 600 },
          { name: 'Square 600x600', url: 'https://picsum.photos/600/600', width: 600, height: 600 }
        ]
      },
      avatars: {
        name: '👤 Avatary',
        images: [
          { name: 'Avatar 1', url: 'https://i.pravatar.cc/150?img=1', width: 150, height: 150 },
          { name: 'Avatar 2', url: 'https://i.pravatar.cc/150?img=2', width: 150, height: 150 },
          { name: 'Avatar 3', url: 'https://i.pravatar.cc/150?img=3', width: 150, height: 150 },
          { name: 'Avatar 4', url: 'https://i.pravatar.cc/150?img=4', width: 150, height: 150 },
          { name: 'Avatar 5', url: 'https://i.pravatar.cc/150?img=5', width: 150, height: 150 },
          { name: 'Random Avatar', url: 'https://i.pravatar.cc/150', width: 150, height: 150 }
        ]
      },
      icons: {
        name: '🎨 Ikony a loga',
        images: [
          { name: 'Logo placeholder', url: 'https://placehold.co/200x80/3b82f6/white?text=LOGO', width: 200, height: 80 },
          { name: 'Icon 64px', url: 'https://placehold.co/64x64/10b981/white?text=Icon', width: 64, height: 64 },
          { name: 'Favicon 32px', url: 'https://placehold.co/32x32/f59e0b/white?text=F', width: 32, height: 32 },
          { name: 'App Icon 192px', url: 'https://placehold.co/192x192/8b5cf6/white?text=App', width: 192, height: 192 },
          { name: 'Social Icon', url: 'https://placehold.co/128x128/ef4444/white?text=Social', width: 128, height: 128 },
          { name: 'Brand Logo', url: 'https://placehold.co/300x100/1f2937/white?text=Brand', width: 300, height: 100 }
        ]
      }
    };
  }

  /**
   * Generate image code
   */
  static generateImageCode(url, width, height, alt = 'Image') {
    return `<img src="${url}" alt="${alt}" width="${width}" height="${height}" style="max-width: 100%; height: auto;" />`;
  }

  /**
   * Insert image into editor
   */
  static insertImage(url, width, height, alt) {
    const code = this.generateImageCode(url, width, height, alt);
    eventBus.emit('editor:insert', code);
    eventBus.emit('toast:show', {
      message: '✅ Obrázek vložen',
      type: 'success'
    });
  }
}
