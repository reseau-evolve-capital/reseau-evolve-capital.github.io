import { VerifyClient } from './VerifyClient'

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string }>
}) {
  const { token_hash } = await searchParams
  return <VerifyClient tokenHash={token_hash ?? null} />
}
