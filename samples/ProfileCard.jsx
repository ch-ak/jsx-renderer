export default function ProfileCard() {
  const skills = ['React', 'TypeScript', 'Node.js', 'GraphQL', 'Tailwind', 'Docker'];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0d0f16 60%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: 40,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24,
        padding: 40,
        width: 380,
        backdropFilter: 'blur(20px)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        textAlign: 'center',
        color: '#e2e8f0',
      }}>
        {/* Avatar */}
        <div style={{
          width: 90,
          height: 90,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6e8efb, #a78bfa)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 36,
          margin: '0 auto 20px',
          boxShadow: '0 0 30px rgba(110,142,251,0.5)',
        }}>
          👨‍💻
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
          Alex Johnson
        </h1>
        <p style={{ color: '#a78bfa', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
          Senior Frontend Engineer
        </p>
        <p style={{ color: '#8892a4', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
          Crafting beautiful, performant web experiences. Open source contributor & design systems enthusiast.
        </p>

        {/* Stats row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 28 }}>
          {[['142', 'Projects'], ['4.8k', 'Followers'], ['98', 'PRs']].map(([val, lbl]) => (
            <div key={lbl}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{val}</div>
              <div style={{ fontSize: 11, color: '#8892a4', fontWeight: 500, marginTop: 2 }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Skills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
          {skills.map((skill) => (
            <span key={skill} style={{
              background: 'rgba(110,142,251,0.12)',
              border: '1px solid rgba(110,142,251,0.25)',
              borderRadius: 20,
              padding: '4px 12px',
              fontSize: 12,
              color: '#a5b4fc',
              fontWeight: 500,
            }}>
              {skill}
            </span>
          ))}
        </div>

        {/* CTA */}
        <button style={{
          width: '100%',
          padding: '12px',
          background: 'linear-gradient(135deg, #6e8efb, #a78bfa)',
          border: 'none',
          borderRadius: 12,
          color: 'white',
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(110,142,251,0.4)',
        }}>
          View Portfolio →
        </button>
      </div>
    </div>
  );
}
