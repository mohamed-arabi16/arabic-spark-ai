import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  onPartialTranscript?: (text: string) => void;
}

export function useVoiceInput({ onTranscript, onPartialTranscript }: UseVoiceInputOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fullTranscriptRef = useRef<string>('');

  const startRecording = useCallback(async () => {
    setIsConnecting(true);
    fullTranscriptRef.current = '';

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      streamRef.current = stream;

      // Get token from edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');

      if (error || !data?.token) {
        throw new Error(error?.message || 'Failed to get transcription token');
      }

      // Connect to ElevenLabs WebSocket
      const ws = new WebSocket('wss://api.elevenlabs.io/v1/scribe');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected to ElevenLabs');
        
        // Send configuration
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

        // Start MediaRecorder
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
        });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = async (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            // Convert to base64 and send
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              ws.send(JSON.stringify({
                type: 'audio',
                audio: base64,
              }));
            };
            reader.readAsDataURL(event.data);
          }
        };

        mediaRecorder.start(100); // Send chunks every 100ms
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
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('Voice transcription error');
        stopRecording();
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        if (fullTranscriptRef.current.trim()) {
          onTranscript(fullTranscriptRef.current.trim());
        }
        setIsRecording(false);
        setIsConnecting(false);
      };

    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Could not access microphone');
      setIsConnecting(false);
      setIsRecording(false);
    }
  }, [onTranscript, onPartialTranscript]);

  const stopRecording = useCallback(() => {
    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
    }
    wsRef.current = null;

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    streamRef.current = null;

    setIsRecording(false);
    setIsConnecting(false);
  }, []);

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
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
