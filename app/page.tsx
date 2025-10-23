export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          AI Voice Tutor
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Personalized educational tutoring through voice conversations
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md">
          <p className="text-sm text-gray-700">
            Welcome to your AI-powered learning companion. Get ready to experience
            interactive tutoring with speech-to-text, AI conversation, and text-to-speech.
          </p>
        </div>
      </div>
    </main>
  );
}
