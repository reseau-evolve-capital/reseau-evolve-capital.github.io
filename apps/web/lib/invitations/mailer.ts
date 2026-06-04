// Interface d'envoi d'invitation (façon PriceProvider). ADM-007 §Email V0.
//
// V0 : aucun provider email applicatif (l'auto-send est l'épopée E-NTF, non construite).
// L'impl par défaut NE FAIT RIEN ; le lien d'invitation est renvoyé à l'UI et copié-collé par
// le trésorier. Brancher Sweego/Resend plus tard = implémenter cette interface et la retourner
// dans getInvitationMailer(), SANS toucher aux Server Actions.

export interface InvitationEmail {
  to: string
  inviteUrl: string
  clubName?: string
}

export interface InvitationMailer {
  /** Renvoie `{ delivered: false }` si aucun envoi n'a eu lieu (V0 : le lien est surfacé dans l'UI). */
  send(email: InvitationEmail): Promise<{ delivered: boolean }>
}

/** Impl V0 : no-op. Le lien est affiché dans l'UI (copier-coller). */
export class NoopInvitationMailer implements InvitationMailer {
  send(email: InvitationEmail): Promise<{ delivered: boolean }> {
    void email // V0 : aucun envoi (E-NTF branchera un provider réel)
    return Promise.resolve({ delivered: false })
  }
}

/** Point d'extension E-NTF : retourner ici un mailer réel (Sweego) quand il sera branché. */
export function getInvitationMailer(): InvitationMailer {
  return new NoopInvitationMailer()
}
