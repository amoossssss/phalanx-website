import AuthService from '@/utils/api/instances/auth/service';
import InsightService from '@/utils/api/instances/insight/service';
import SquadService from '@/utils/api/instances/squad/service';
import WalletService from '@/utils/api/instances/wallet/service';

class ApiService {
  static auth = AuthService;
  static insight = InsightService;
  static squad = SquadService;
  static wallet = WalletService;
}

export default ApiService;
