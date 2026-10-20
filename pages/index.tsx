// There's no landing page: this instance only serves comments for its owner's
// sites, so "/" goes straight to the dashboard (which sends you to sign in).
export default function Index() {
  return null
}

export async function getServerSideProps() {
  return { redirect: { destination: '/dashboard', permanent: false } }
}
