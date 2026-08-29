import type { CompanyMember } from '../api/companyApi';
import { memberDisplayEmail } from './displayEmail';

export const isFinancialAdvisor = (member: CompanyMember): boolean => {
  if (member.isPlatformAdmin) return false;
  if (member.rank) return member.rank === 'financial_advisor';
  const role = (member.role?.name ?? '').trim().toLowerCase();
  return role === 'advisor' || role === 'financial advisor';
};

export const financialAdvisorsInScope = (members: CompanyMember[] | undefined): CompanyMember[] =>
  (members ?? []).filter(isFinancialAdvisor);

export const memberDisplayName = (
  member: Pick<CompanyMember, 'id' | 'firstName' | 'lastName' | 'email'>,
  peers: readonly Pick<CompanyMember, 'id' | 'firstName' | 'lastName' | 'email'>[] = []
): string => {
  const name = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim();
  return name || memberDisplayEmail(member, peers);
};
