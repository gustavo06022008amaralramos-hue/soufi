export function Skeleton({ className = '', style = {} }) {
  return <div className={`skeleton ${className}`} style={style} />;
}

export function CardSkeleton() {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
      <Skeleton style={{ height: 12, width: '40%', marginBottom: 12 }} />
      <Skeleton style={{ height: 28, width: '60%', marginBottom: 8 }} />
      <Skeleton style={{ height: 10, width: '80%' }} />
    </div>
  );
}

export function ChartSkeleton({ height = 180 }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
      <Skeleton style={{ height: 12, width: '35%', marginBottom: 16 }} />
      <Skeleton style={{ height, borderRadius: 8 }} />
    </div>
  );
}
