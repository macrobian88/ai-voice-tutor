'use client';

import { useState, useRef, useEffect } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useAuth } from '@/hooks/useAuth';
import { Mic, MicOff, Send, Volume2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;
  inScope?: boolean;
}

interface TutorSessionProps {
  chapterId: string;
  chapterTitle: string;
  onSessionEnd?: () => void;
}

export default function TutorSession({
  chapterId,
  chapterTitle,
  onSessionEnd,
}: TutorSessionProps) {
  const { token } = useAuth();
  const {
    isRecording,
    audioBlob,
    duration,
    startRecording,
    stopRecording,
    clearRecording,
  } = useAudioRecorder();

  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle recording
  const handleStartRecording = async () => {
    await startRecording();
  };

  const handleStopRecording = async () => {
    stopRecording();
  };

  // Send audio to backend
  useEffect(() => {
    if (audioBlob && !isRecording) {
      sendAudioMessage(audioBlob);
    }
  }, [audioBlob, isRecording]);

  const sendAudioMessage = async (blob: Blob) => {
    if (!token) return;

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      formData.append('chapterId', chapterId);
      if (sessionId) {
        formData.append('sessionId', sessionId);
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Failed to send message');
      }

      const data = await res.json();

      // Set session ID if first message
      if (!sessionId) {
        setSessionId(data.sessionId);
      }

      // Add messages to chat
      const userMessage: Message = {
        role: 'user',
        content: '(Voice message)', // Transcription not shown in UI
        timestamp: new Date(),
      };

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        inScope: data.inScope,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      // Play audio response
      if (data.audioBuffer) {
        playAudioResponse(data.audioBuffer);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsProcessing(false);
      clearRecording();
    }
  };

  const playAudioResponse = (base64Audio: string) => {
    // Stop current audio if playing
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    // Convert base64 to blob and play
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'audio/mp3' });
    const url = URL.createObjectURL(blob);
    
    const audio = new Audio(url);
    audio.play();
    setCurrentAudio(audio);

    audio.onended = () => {
      URL.revokeObjectURL(url);
      setCurrentAudio(null);
    };
  };

  const handleEndSession = async () => {
    if (sessionId) {
      try {
        await fetch(`/api/sessions/${sessionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ completionReason: 'user_ended' }),
        });
      } catch (error) {
        console.error('Error ending session:', error);
      }
    }
    onSessionEnd?.();
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{chapterTitle}</h1>
          <p className="text-sm text-gray-600">AI Voice Tutor Session</p>
        </div>
        <Button variant="outline" onClick={handleEndSession}>
          End Session
        </Button>
      </div>

      {/* Messages */}
      <Card className="flex-1 overflow-y-auto p-4 mb-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <Mic className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Press the microphone button to start your tutoring session</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : msg.inScope === false
                    ? 'bg-yellow-100 text-gray-900 border-2 border-yellow-400'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                {msg.inScope === false && (
                  <p className="text-xs mt-2 font-semibold">Off-topic question</p>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </Card>

      {/* Recording Controls */}
      <div className="flex items-center justify-center space-x-4">
        {!isRecording && !isProcessing && (
          <Button
            size="lg"
            className="w-20 h-20 rounded-full"
            onClick={handleStartRecording}
          >
            <Mic className="w-8 h-8" />
          </Button>
        )}

        {isRecording && (
          <>
            <div className="text-center">
              <div className="text-2xl font-mono mb-2">
                {Math.floor(duration / 60)}:{(Math.floor(duration) % 60).toString().padStart(2, '0')}
              </div>
              <div className="flex space-x-2">
                <Button
                  size="lg"
                  variant="destructive"
                  className="w-20 h-20 rounded-full"
                  onClick={handleStopRecording}
                >
                  <MicOff className="w-8 h-8" />
                </Button>
              </div>
            </div>
          </>
        )}

        {isProcessing && (
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-600">Processing...</p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-4 text-center text-xs text-gray-500">
        {isRecording && 'Recording... Press stop when done'}
        {!isRecording && !isProcessing && 'Hold and speak, then release'}
        {isProcessing && 'Transcribing and generating response...'}
      </div>
    </div>
  );
}
