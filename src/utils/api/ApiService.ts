import AuthService from '@/utils/api/instances/auth/service';
import SquadService from '@/utils/api/instances/squad/service';

class ApiService {
  static auth = AuthService;
  static squad = SquadService;
}

export default ApiService;
