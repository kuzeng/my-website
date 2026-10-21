// The assistant's public knowledge: the same facts this site renders in production, as JSON.
// Built statically to /kb.json; the assistant Worker fetches it. Unconfirmed lines and drafts are never included,
// even in dev, so the model can't repeat a placeholder.
import type { APIRoute } from 'astro';
import { profile } from '../data/profile';
import { experience } from '../data/experience';
import { education } from '../data/education';
import { projects } from '../data/projects';
import { skills } from '../data/skills';
import { now, nowUpdated } from '../data/now';
import { featured } from '../data/featured';
import { aiPractice } from '../data/ai';

export const GET: APIRoute = () => {
  const kb = {
    person: {
      name: profile.name,
      role: profile.role,
      company: profile.company,
      location: profile.location,
      summary: profile.subhead,
      ...(profile.openTo ? { openTo: profile.openTo } : {}),
    },
    contact: { email: profile.email, linkedin: profile.linkedin, github: profile.github, site: profile.site },
    experience: experience.map(({ sortKey, ...role }) => role),
    education: education.map(({ sortKey, ...school }) => school),
    projects: projects.map(({ image, ...project }) => project),
    ...(featured ? { flagship: { ...featured, screens: undefined } } : {}),
    ...(aiPractice ? { aiPractice } : {}),
    skills,
    now: { updated: nowUpdated, items: now.filter((i) => i.confirmed).map(({ label, text }) => ({ label, text })) },
  };
  return new Response(JSON.stringify(kb, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8' } });
};
