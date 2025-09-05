export function TopologyBackground() {
  return (
    <>
      <div className="fixed inset-0 -z-20 bg-background" />
      <div 
        className="fixed inset-0 -z-10 pointer-events-none opacity-[0.03] dark:opacity-[0.02] dark:invert"
        style={{
          backgroundImage: 'url("/topology.svg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
    </>
  )
}