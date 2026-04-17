import { createAudioPlayer } from 'expo-audio';

// Pre-carga en memoria (Module scope)
const SOUND_FILES = {
    beep: require('../../../assets/sounds/beep.mp3'),
    success: require('../../../assets/sounds/success.wav'),
    error: require('../../../assets/sounds/error.wav')
};

const players: { [key: string]: any } = {};

export const precargarSonidos = async () => {
    if (!players.beep) players.beep = createAudioPlayer(SOUND_FILES.beep);
    if (!players.success) players.success = createAudioPlayer(SOUND_FILES.success);
    if (!players.error) players.error = createAudioPlayer(SOUND_FILES.error);
};

export const reproducirSonido = async (tipo: 'beep' | 'success' | 'error') => {
    try {
        let player = players[tipo];
        if (!player) {
            player = createAudioPlayer(SOUND_FILES[tipo]);
            players[tipo] = player;
        }
        player.seekTo(0);
        player.play();
    } catch (error) {
        console.warn('Error al reproducir sonido:', error);
    }
};
