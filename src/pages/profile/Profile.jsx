import classnames from "classnames"
import React, { useEffect, useState } from "react"
import { toast } from "react-toastify"
import {
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Nav,
  NavItem,
  NavLink,
  Row,
  TabContent,
  TabPane,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button
} from "reactstrap"
import BreadCrumb from "../../components/BreadCrumb"
import { init } from "../../context/AuthContext"
import { useAuth } from "../../hooks/useAuth"
import { userService } from "../../services/user-service"
import ChangePassword from "./ChangePassword"
import ProfileDetail from "./ProfileDetail"
import qrUpgradePro from "../../assets/images/ExampleCode.png"

const Profile = () => {
  document.title = "Thông tin cá nhân | MyAIS"
  const { user, dispatch } = useAuth()
  const [activeTab, setActiveTab] = useState("1")
  const planType = user?.planType ?? user?.PlanType ?? "Free"
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)

  const tabChange = (tab) => {
    if (activeTab !== tab) setActiveTab(tab)
  }

  useEffect(() => {
    getProfile()
  }, [])

  const getProfile = async () => {
    try {
      const res = await userService.getUserInfo()
      dispatch(init({ isAuthenticated: true, user: res }))
    } catch (err) {
      console.log("error: ", err)
      toast.error(err.message || "Không lấy được thông tin người dùng")
    }
  }

  const handleUpgradeToPro = async () => {
    try {
      setIsUpgrading(true)
      const res = await userService.upgradeMyPlanToPro(1)
      toast.success("Đã gửi yêu cầu nâng cấp Pro. Nếu chưa thấy hiệu lực, vui lòng đăng nhập lại.")

      // load lại thông tin user
      await getProfile()

      // đóng modal
      setIsUpgradeModalOpen(false)
    } catch (err) {
      console.error(err)
      toast.error("Nâng cấp Pro thất bại, vui lòng thử lại.")
    } finally {
      setIsUpgrading(false)
    }
  }
  return (
    <React.Fragment>
      <div className="page-content" style={{marginTop: '100px'}}>
        <Container fluid>
          <BreadCrumb title="Thông tin cá nhân" pageTitle="Trang chủ" />
          <Row className="mb-3">
            <Col md={6}>
              <Card>
                <CardBody className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-1">Gói hiện tại</h5>
                    <p className="mb-0">
                      <b>{planType === "Pro" ? "Pro" : "Free"}</b>
                    </p>
                  </div>
                  {planType === "Free" ? (
                    <Button
                      color="primary"
                      onClick={() => setIsUpgradeModalOpen(true)}
                      disabled={isUpgrading}
                    >
                      {isUpgrading ? "Đang nâng cấp..." : "Nâng cấp lên Pro"}
                    </Button>
                  ) : (
                    <span className="badge bg-success">Tài khoản Pro</span>
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>
          <Row>
            <Col>
              <Card>
                <CardHeader>
                  <Nav className="nav-tabs-custom rounded card-header-tabs border-bottom-0" role="tablist">
                    <NavItem>
                      <NavLink
                        to="#"
                        className={classnames({ active: activeTab === "1" })}
                        onClick={() => {
                          tabChange("1")
                        }}
                        type="button"
                      >
                        <i className="fas fa-home"></i>
                        Thông tin chung
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        to="#"
                        className={classnames({ active: activeTab === "2" })}
                        onClick={() => {
                          tabChange("2")
                        }}
                        type="button"
                      >
                        <i className="far fa-user"></i>
                        Đổi mật khẩu
                      </NavLink>
                    </NavItem>
                  </Nav>
                </CardHeader>
                <CardBody className="p-4">
                  <TabContent activeTab={activeTab}>
                    <TabPane tabId="1">
                      <ProfileDetail />
                    </TabPane>

                    <TabPane tabId="2">
                      <ChangePassword />
                    </TabPane>
                  </TabContent>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
        <Modal
          isOpen={isUpgradeModalOpen}
          toggle={() => !isUpgrading && setIsUpgradeModalOpen(false)}
          centered
        >
          <ModalHeader toggle={() => !isUpgrading && setIsUpgradeModalOpen(false)}>
            Nâng cấp lên gói Pro
          </ModalHeader>
          <ModalBody className="text-center">
            <p className="mb-3">
              Vui lòng quét mã QR bên dưới để thanh toán gói <b>MyAIS Pro</b>.
              Sau khi thanh toán xong, bấm nút <b>"Tôi đã thanh toán"</b> để kích hoạt.
            </p>
            <div className="d-flex justify-content-center mb-3">
              <img
                src={qrUpgradePro}
                alt="QR thanh toán Pro"
                style={{ maxWidth: "260px", width: "100%", height: "auto", borderRadius: 8, boxShadow: "0 0 10px rgba(0,0,0,0.15)" }}
              />
            </div>
            <p className="text-muted" style={{ fontSize: 12 }}>
              * Nếu gói Pro chưa được kích hoạt ngay, hãy thử đăng xuất và đăng nhập lại sau vài phút.
            </p>
          </ModalBody>
          <ModalFooter className="justify-content-between">
            <Button
              color="secondary"
              onClick={() => setIsUpgradeModalOpen(false)}
              disabled={isUpgrading}
            >
              Hủy
            </Button>
            <Button
              color="primary"
              onClick={handleUpgradeToPro}
              disabled={isUpgrading}
            >
              {isUpgrading ? "Đang kiểm tra thanh toán..." : "Tôi đã thanh toán"}
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </React.Fragment>
  )
}

export default Profile
