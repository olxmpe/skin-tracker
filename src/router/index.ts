import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/chat' },
    { path: '/chat', component: () => import('@/views/ChatView.vue'), meta: { title: 'Chat' } },
    { path: '/agent', component: () => import('@/views/AgentView.vue'), meta: { title: 'Suivi' } },
    { path: '/dashboard', component: () => import('@/views/DashboardView.vue'), meta: { title: 'Dashboard' } },
    { path: '/timeline', component: () => import('@/views/TimelineView.vue'), meta: { title: 'Historique' } },
    { path: '/settings', component: () => import('@/views/SettingsView.vue'), meta: { title: 'Paramètres' } },
    { path: '/import', component: () => import('@/views/ImportView.vue'), meta: { title: 'Import' } },
    { path: '/evolution', component: () => import('@/views/EvolutionView.vue'), meta: { title: 'Évolutions' } },
  ],
})
