// src/services/notificationService.ts

type NotificationType = 'casa' | 'visitante' | 'empate' | 'info';

class NotificationService {
  private static instance: NotificationService;
  private audioContext: AudioContext | null = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  playSound(type: NotificationType = 'info') {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      let frequency = 800;
      let duration = 0.15;
      let volume = 0.3;

      switch (type) {
        case 'casa':
          frequency = 1200;
          duration = 0.2;
          volume = 0.4;
          break;
        case 'visitante':
          frequency = 600;
          duration = 0.2;
          volume = 0.4;
          break;
        case 'empate':
          frequency = 900;
          duration = 0.3;
          volume = 0.35;
          break;
        default:
          frequency = 800;
          duration = 0.15;
          volume = 0.3;
      }

      oscillator.frequency.value = frequency;
      gainNode.gain.value = volume;

      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + duration);

      if (type === 'casa' || type === 'visitante') {
        setTimeout(() => {
          const osc2 = this.audioContext!.createOscillator();
          const gain2 = this.audioContext!.createGain();
          osc2.connect(gain2);
          gain2.connect(this.audioContext!.destination);
          osc2.frequency.value = frequency * 1.2;
          gain2.gain.value = volume * 0.7;
          osc2.start();
          osc2.stop(this.audioContext!.currentTime + duration * 0.8);
        }, 150);
      }

    } catch (error) {
      console.log('🔇 Erro ao tocar som:', error);
    }
  }

  vibrate(pattern: number | number[] = [200, 100, 200]) {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  showBrowserNotification(title: string, body: string, type: NotificationType = 'info') {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: type === 'casa' ? '🟢' : type === 'visitante' ? '🔴' : '🟡',
        silent: true,
        tag: 'signal-notification',
        requireInteraction: true
      });
    } else if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  notify(message: string, type: NotificationType = 'info') {
    this.playSound(type);
    this.vibrate();

    const titles = {
      'casa': '🏠 Sinal de CASA',
      'visitante': '✈️ Sinal de VISITANTE',
      'empate': '⚖️ Sinal de EMPATE',
      'info': 'ℹ️ Informação'
    };

    this.showBrowserNotification(titles[type] || 'Sinal', message, type);
    console.log(`🔔 ${titles[type]}: ${message}`);
  }

  requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}

export const notificationService = NotificationService.getInstance();
