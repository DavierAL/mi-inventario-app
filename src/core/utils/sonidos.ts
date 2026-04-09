import { createAudioPlayer } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

let beepSound: AudioPlayer | null = null;
let successSound: AudioPlayer | null = null;
let errorSound: AudioPlayer | null = null;

// Pre-cargar los sonidos usando expo-audio
export const precargarSonidos = async () => {
    try {
        if (!beepSound) beepSound = createAudioPlayer(require('../../../assets/sounds/beep.wav'));
        if (!successSound) successSound = createAudioPlayer(require('../../../assets/sounds/success.wav'));
        if (!errorSound) errorSound = createAudioPlayer(require('../../../assets/sounds/error.wav'));
    } catch (error) {
        console.warn("No se pudieron cargar los audios locales", error);
    }
};

export const reproducirSonido = async (tipo: 'beep' | 'success' | 'error') => {
    try {
        let sonido: AudioPlayer | null = null;
        if (tipo === 'beep') sonido = beepSound;
        if (tipo === 'success') sonido = successSound;
        if (tipo === 'error') sonido = errorSound;

        if (sonido) {
            sonido.seekTo(0);
            sonido.play();
        }
    } catch (error) {
        // Ignorar si el audio falla por silenciamiento o falta de carga
    }
};
