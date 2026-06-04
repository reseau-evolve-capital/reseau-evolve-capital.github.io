import { VerifyClient } from './VerifyClient'

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; invited?: string }>
}) {
  const { token_hash, type, invited } = await searchParams
  return (
    <VerifyClient tokenHash={token_hash ?? null} otpType={type ?? null} invited={invited === '1'} />
  )
}
