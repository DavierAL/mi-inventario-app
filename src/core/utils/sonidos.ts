import { Audio } from 'expo-av';

// Pre-carga en memoria (Module scope)
const SOUND_FILES = {
    beep: require('../../../assets/sounds/beep.mp3'),
    success: require('../../../assets/sounds/success.wav'),
    error: require('../../../assets/sounds/error.wav')
};

export const precargarSonidos = async () => {
    // Implementación vacía para compatibilidad, ya que ahora se pre-cargan en el scope del módulo
};

export const reproducirSonido = async (tipo: 'beep' | 'success' | 'error') => {
    try {
        const { sound } = await Audio.Sound.createAsync(SOUND_FILES[tipo]);
        await sound.playAsync();
        
        sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
                sound.unloadAsync();
            }
        });
    } catch (error) {
        console.warn('Error al reproducir sonido:', error);
    }
};
