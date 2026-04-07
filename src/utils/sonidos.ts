import { Audio } from 'expo-av';

let beepSound: Audio.Sound | null = null;
let successSound: Audio.Sound | null = null;
let errorSound: Audio.Sound | null = null;

// Pre-cargar los sonidos para que no haya delay al reproducir
export const precargarSonidos = async () => {
    try {
        const { sound: sBeep } = await Audio.Sound.createAsync(require('../../assets/sounds/beep.wav'));
        beepSound = sBeep;

        const { sound: sSuccess } = await Audio.Sound.createAsync(require('../../assets/sounds/success.wav'));
        successSound = sSuccess;

        const { sound: sError } = await Audio.Sound.createAsync(require('../../assets/sounds/error.wav'));
        errorSound = sError;
    } catch (error) {
        console.warn("No se pudieron cargar los audios locales", error);
    }
};

export const reproducirSonido = async (tipo: 'beep' | 'success' | 'error') => {
    try {
        let sonido: Audio.Sound | null = null;
        if (tipo === 'beep') sonido = beepSound;
        if (tipo === 'success') sonido = successSound;
        if (tipo === 'error') sonido = errorSound;

        if (sonido) {
            await sonido.setPositionAsync(0);
            await sonido.playAsync();
        }
    } catch (error) {
        // Ignorar si el audio falla por silenciamiento o falta de carga
    }
};
