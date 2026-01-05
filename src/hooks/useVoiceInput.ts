import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  onPartialTranscript?: (text: string) => void;
}

// Audio conversion utilities
function float32ToPcm16(float32Array: Float32Array): Int16Array {
  const pcm16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return pcm16;
}

function int16ToBase64(int16Array: Int16Array): string {
  const bytes = new Uint8Array(int16Array.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function useVoiceInput({ onTranscript, onPartialTranscript }: UseVoiceInputOptions) {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fullTranscriptRef = useRef<string>('');
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    // Clear recording timeout
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    // Disconnect audio processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setIsConnecting(false);
  }, []);

  const startRecording = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    fullTranscriptRef.current = '';

    try {
      // Check for microphone support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access not supported in this browser');
      }

      // Request microphone permission
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          } 
        });
      } catch (permissionError: any) {
        if (permissionError.name === 'NotAllowedError') {
          throw new Error(t('voice.permissionDenied') || 'Microphone permission denied. Please allow access in your browser settings.');
        }
        if (permissionError.name === 'NotFoundError') {
          throw new Error(t('voice.noMicrophone') || 'No microphone found. Please connect a microphone and try again.');
        }
        throw permissionError;
      }
      
      streamRef.current = stream;

      // Get token from edge function
      const { data, error: tokenError } = await supabase.functions.invoke('elevenlabs-scribe-token');

      if (tokenError || !data?.token) {
        throw new Error(tokenError?.message || 'Failed to get transcription token');
      }

      // Create AudioContext with 16kHz sample rate
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      // Connect to ElevenLabs WebSocket
      const ws = new WebSocket('wss://api.elevenlabs.io/v1/scribe');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected to ElevenLabs');
        
        // Send configuration with PCM format
        ws.send(JSON.stringify({
          type: 'configure',
          token: data.token,
          model_id: 'scribe_v2_realtime',
          audio_format: 'pcm_16000',
          language_code: 'ar', // Arabic-first
          vad_events: true,
        }));

        setIsConnecting(false);
        setIsRecording(true);

        // Set up audio processing with ScriptProcessor for real-time PCM
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (event) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = event.inputBuffer.getChannelData(0);
            const pcm16 = float32ToPcm16(inputData);
            const base64Audio = int16ToBase64(pcm16);
            
            ws.send(JSON.stringify({
              type: 'audio',
              audio: base64Audio,
            }));
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        // Set 60-second timeout
        recordingTimeoutRef.current = setTimeout(() => {
          toast.warning(t('voice.recordingTimeout') || 'Recording stopped after 60 seconds');
          stopRecording();
        }, 60000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('ElevenLabs message:', data.type);

          if (data.type === 'partial_transcript') {
            onPartialTranscript?.(data.text || '');
          } else if (data.type === 'committed_transcript') {
            fullTranscriptRef.current += (fullTranscriptRef.current ? ' ' : '') + (data.text || '');
            onPartialTranscript?.('');
          } else if (data.type === 'error') {
            console.error('ElevenLabs error:', data.error);
            toast.error(data.error || 'Transcription error');
            cleanup();
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Voice transcription connection failed');
        toast.error(t('voice.connectionError') || 'Voice transcription connection failed');
        cleanup();
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        
        // Only call onTranscript if we have content
        if (fullTranscriptRef.current.trim()) {
          onTranscript(fullTranscriptRef.current.trim());
        }
        
        cleanup();
      };

    } catch (error: any) {
      console.error('Failed to start recording:', error);
      setError(error.message || 'Could not access microphone');
      toast.error(error.message || t('voice.micError') || 'Could not access microphone');
      cleanup();
    }
  }, [onTranscript, onPartialTranscript, cleanup, t]);

  const stopRecording = useCallback(() => {
    // Send end signal to WebSocket if open
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end' }));
    }
    cleanup();
  }, [cleanup]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    isConnecting,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
