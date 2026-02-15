import { useEffect, useState } from 'react';
import { api } from './api/client';

type Article = { id: number; code: string; designation: string; prixHt: string; photoPath?: string; multipleCommande: number };

export function App() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('admin@local.dev');
  const [password, setPassword] = useState('admin123');
  const [articles, setArticles] = useState<Article[]>([]);
  const [emplacements, setEmplacements] = useState<any[]>([]);
  const [commandes, setCommandes] = useState<any[]>([]);

  const load = async () => {
    setArticles(await api('/articles'));
    setEmplacements(await api('/emplacements'));
    setCommandes(await api('/commandes'));
  };

  const login = async () => {
    const res = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    localStorage.setItem('token', res.token);
    setUser(res.user);
    await load();
  };

  useEffect(() => {
    if (localStorage.getItem('token')) {
      api('/auth/me').then(setUser).then(load).catch(() => localStorage.removeItem('token'));
    }
  }, []);

  if (!user)
    return (
      <main className="container auth-layout">
        <section className="auth-card">
          <p className="auth-kicker">AMETUS STYLE</p>
          <h1>EtandStock</h1>
          <div className="auth-fields">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />
            <button onClick={login}>Se connecter</button>
          </div>
        </section>
      </main>
    );

  return (
    <main className="container">
      <h1>EtandStock</h1>
      <p className="status">Connecté: {user.nom} ({user.role})</p>
      <section>
        <h2>Catalogue</h2>
      <p>Connecté: {user.nom} ({user.role})</p>

      <nav aria-label="Menu principal" className="home-menu">
        <a href="#referentiel-articles">Référentiel articles</a>
        <a href="#gestion-emplacements">Gestion des emplacements</a>
        <a href="#gestion-commandes">Gestion des commandes</a>
      </nav>

      <section id="referentiel-articles">
        <h2>Référentiel articles</h2>
        <table><thead><tr><th>Code</th><th>Désignation</th><th>Prix HT</th><th>Multiple</th><th>Photo</th></tr></thead><tbody>
          {articles.map((a) => <tr key={a.id}><td>{a.code}</td><td>{a.designation}</td><td>{a.prixHt}€</td><td>{a.multipleCommande}</td><td>{a.photoPath ? <img src={`http://localhost:3001/uploads/${a.photoPath}`} width={40} /> : '-'}</td></tr>)}
        </tbody></table>
      </section>

      <section id="gestion-emplacements">
        <h2>Gestion des emplacements</h2>
        <ul>{emplacements.map((e) => <li key={e.id}>{e.code} (N{e.niveau}/T{e.travee})</li>)}</ul>
      </section>

      <section id="gestion-commandes">
        <h2>Gestion des commandes</h2>
        <button onClick={async () => { await api('/commandes', { method: 'POST', body: JSON.stringify({ destinationType: 'AGENCE', destinationId: 1 }) }); await load(); }}>Créer brouillon agence</button>
        <ul>{commandes.map((c) => <li key={c.id}>{c.numero} - {c.statut} ({c.lignes.length} lignes)</li>)}</ul>
      </section>
    </main>
  );
}
