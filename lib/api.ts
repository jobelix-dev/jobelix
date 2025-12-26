import {
  LoginPayload,
  LoginResponse,
  SignupPayload,
  SignupResponse,
  ProfileResponse,
  ResumeResponse,
  UploadResponse,
  OffersResponse,
  CreateOfferPayload,
  CreateOfferResponse,
  DeleteOfferResponse,
  ExtractDataResponse,
} from './types'

class ApiClient {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Request failed')
    }

    return data
  }

  // ========== AUTH ==========
  async signup(payload: SignupPayload): Promise<SignupResponse> {
    return this.request<SignupResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async login(payload: LoginPayload): Promise<LoginResponse> {
    return this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async logout(): Promise<{ success: boolean }> {
    return this.request('/api/auth/logout', {
      method: 'POST',
    })
  }

  async getProfile(): Promise<ProfileResponse> {
    return this.request<ProfileResponse>('/api/auth/profile')
  }

  // ========== RESUME ==========
  async getResume(): Promise<ResumeResponse> {
    return this.request<ResumeResponse>('/api/resume')
  }

  async uploadResume(file: File): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/resume', {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Upload failed')
    }

    return data
  }

  async downloadResume(): Promise<Blob> {
    const response = await fetch('/api/resume/download')

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Download failed')
    }

    return response.blob()
  }

  async extractResumeData(): Promise<ExtractDataResponse> {
    return this.request<ExtractDataResponse>('/api/resume/extract-data', {
      method: 'POST',
    })
  }

  // ========== OFFERS ==========
  async getOffers(): Promise<OffersResponse> {
    return this.request<OffersResponse>('/api/offers')
  }

  async createOffer(payload: CreateOfferPayload): Promise<CreateOfferResponse> {
    return this.request<CreateOfferResponse>('/api/offers', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async deleteOffer(id: string): Promise<DeleteOfferResponse> {
    return this.request<DeleteOfferResponse>(`/api/offers/${id}`, {
      method: 'DELETE',
    })
  }
}

export const api = new ApiClient()
