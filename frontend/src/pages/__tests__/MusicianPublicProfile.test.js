import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen } from '@testing-library/react';
import MusicianPublicProfile from '../MusicianPublicProfile';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const navigateMock = vi.hoisted(() => vi.fn());
const getPublicProfileMock = vi.hoisted(() => vi.fn());
const listSponsorsMock = vi.hoisted(() => vi.fn());
const companyAuthState = vi.hoisted(() => ({ value: false }));
vi.mock('../../components/Layout/FullscreenBackground', () => ({
    default: ({ children }) => _jsx("div", { children: children }),
}));
vi.mock('../../services/publicApi', () => ({
    contactRequestService: {
        create: vi.fn(),
    },
    publicMusicianService: {
        getPublicProfile: getPublicProfileMock,
        listSponsors: listSponsorsMock,
    },
}));
vi.mock('../../contexts/CompanyAuthContext', () => ({
    useCompanyAuth: () => ({
        isAuthenticated: companyAuthState.value,
    }),
}));
vi.mock('../../utils/toast', () => ({
    showToast: {
        success: vi.fn(),
        error: vi.fn(),
        apiError: vi.fn(),
    },
}));
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => navigateMock,
    };
});
describe('MusicianPublicProfile', () => {
    const mockMusician = {
        id: 1,
        full_name: 'João Silva',
        instrument: 'guitar',
        instruments: ['guitar'],
        bio: null,
        city: 'São Paulo',
        state: 'SP',
        instagram: null,
        avatar_url: null,
        cover_image_url: null,
        average_rating: 0,
        total_ratings: 0,
    };
    const renderPage = () => render(_jsx(MemoryRouter, { initialEntries: ['/musico/1'], children: _jsx(Routes, { children: _jsx(Route, { path: "/musico/:id", element: _jsx(MusicianPublicProfile, {}) }) }) }));
    beforeEach(() => {
        navigateMock.mockReset();
        getPublicProfileMock.mockReset();
        listSponsorsMock.mockReset();
        companyAuthState.value = false;
    });
    it('abre modal de contato quando empresa está autenticada', async () => {
        companyAuthState.value = true;
        getPublicProfileMock.mockResolvedValue(mockMusician);
        listSponsorsMock.mockResolvedValue([]);
        renderPage();
        const button = await screen.findByRole('button', { name: 'Solicitar Contato' });
        fireEvent.click(button);
        expect(await screen.findByRole('heading', { name: /Solicitar contato/i })).toBeInTheDocument();
    });
    it('redireciona para cadastro de empresa quando não autenticada', async () => {
        getPublicProfileMock.mockResolvedValue(mockMusician);
        listSponsorsMock.mockResolvedValue([]);
        renderPage();
        const button = await screen.findByRole('button', { name: 'Solicitar Contato' });
        fireEvent.click(button);
        expect(navigateMock).toHaveBeenCalledWith('/cadastro-empresa');
    });
});
