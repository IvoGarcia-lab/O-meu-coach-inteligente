import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center px-4 pt-16">
      <h2 className="text-4xl font-headline font-bold text-accent mb-4">404</h2>
      <p className="text-xl mb-6">Página não encontrada</p>
      <Link href="/" className="px-6 py-2 bg-primary text-on-primary rounded-xl font-medium">
        Voltar ao início
      </Link>
    </div>
  );
}
